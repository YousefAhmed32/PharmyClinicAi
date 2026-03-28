const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const User           = require('../models/User');
const chatRepository = require('../repositories/chatRepository');

const onlineUsers = new Map();

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET','POST'], credentials: true },
    pingTimeout: 60000, pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ','');
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select('name email role avatar isActive language');
      if (!user || !user.isActive) return next(new Error('User not found or inactive'));
      socket.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatar: user.avatar, language: user.language || 'ar' };
      next();
    } catch { next(new Error('Invalid or expired token')); }
  });

  io.on('connection', async (socket) => {
    const { id: userId, role, name } = socket.user;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('user:online', { userId, name, role });

    socket.join(`user:${userId}`);
    if (role === 'admin') socket.join('admin-room');

    if (role === 'patient') {
      const [supportRoom, aiRoom] = await Promise.all([
        chatRepository.findOrCreateRoom(userId, 'support'),
        chatRepository.findOrCreateRoom(userId, 'ai'),
      ]);
      socket.join(supportRoom.roomId);
      socket.join(aiRoom.roomId);
    }

    // ── Join room ─────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomId }) => {
      try {
        const room = await chatRepository.findRoomByRoomId(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (role === 'patient' && room.patient._id.toString() !== userId)
          return socket.emit('error', { message: 'Access denied' });
        socket.join(roomId);
        await chatRepository.markMessagesRead(roomId, userId);
        await chatRepository.markRoomRead(roomId, role);
        const { messages, total } = await chatRepository.getMessages(roomId, { page:1, limit:50 });
        socket.emit('messages:history', { messages, total, roomId, type: room.type });
        socket.emit('room:joined', { roomId, type: room.type });
      } catch { socket.emit('error', { message: 'Failed to join room' }); }
    });

    // ── Support message (patient ↔ admin) ────────────────────────────────
    socket.on('message:send', async ({ roomId, content }) => {
      try {
        if (!content?.trim()) return socket.emit('error', { message: 'Empty message' });
        if (content.length > 2000) return socket.emit('error', { message: 'Too long' });
        const room = await chatRepository.findRoomByRoomId(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.status === 'closed') return socket.emit('error', { message: 'Chat closed' });
        if (role === 'patient' && room.patient._id.toString() !== userId)
          return socket.emit('error', { message: 'Access denied' });

        const message = await chatRepository.saveMessage({
          room: roomId, sender: userId, senderRole: role,
          content: content.trim(), chatType: room.type || 'support',
        });
        const populated = await message.populate('sender', 'name avatar role');
        await chatRepository.updateRoomLastMessage(roomId, content.trim(), userId, role);
        await chatRepository.incrementUnread(roomId, role);
        io.to(roomId).emit('message:new', populated);

        if (role === 'patient') {
          io.to('admin-room').emit('chat:notification', {
            roomId, patient: { id: userId, name },
            preview: content.trim().slice(0, 60), timestamp: new Date(),
          });
        }
      } catch { socket.emit('error', { message: 'Failed to send' }); }
    });

    // ── AI message — persist both user prompt and AI reply ───────────────
    socket.on('ai:message', async ({ content, aiReply, aiMetadata }) => {
      try {
        if (!content?.trim()) return;
        const aiRoomId = `ai_${userId}`;
        const room = await chatRepository.findOrCreateRoom(userId, 'ai');

        // Save user message
        await chatRepository.saveMessage({
          room: aiRoomId, sender: userId, senderRole: 'patient',
          content: content.trim(), chatType: 'ai',
        });

        // Save AI reply
        if (aiReply) {
          await chatRepository.saveMessage({
            room: aiRoomId, sender: null, senderRole: 'ai',
            content: aiReply.trim(), chatType: 'ai',
            metadata: aiMetadata || null,
          });
          await chatRepository.updateRoomLastMessage(aiRoomId, aiReply.trim(), null, 'ai');
        }
      } catch (err) { console.error('ai:message persist error', err.message); }
    });

    // ── Typing ───────────────────────────────────────────────────────────
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('typing', { userId, name, isTyping });
    });

    // ── Read ─────────────────────────────────────────────────────────────
    socket.on('messages:read', async ({ roomId }) => {
      try {
        await chatRepository.markMessagesRead(roomId, userId);
        await chatRepository.markRoomRead(roomId, role);
        socket.to(roomId).emit('messages:read', { userId, roomId });
      } catch {}
    });

    // ── Close/Reopen room ────────────────────────────────────────────────
    socket.on('room:close', async ({ roomId }) => {
      if (role !== 'admin') return socket.emit('error', { message: 'Admin only' });
      try {
        const room = await chatRepository.closeRoom(roomId, userId);
        io.to(roomId).emit('room:closed', { roomId, room });
        await chatRepository.saveMessage({
          room: roomId, sender: userId, senderRole: 'admin',
          content: 'Chat closed by support.', type: 'system', chatType: room.type || 'support',
        });
      } catch { socket.emit('error', { message: 'Failed to close' }); }
    });

    socket.on('room:reopen', async ({ roomId }) => {
      if (role !== 'admin') return socket.emit('error', { message: 'Admin only' });
      try {
        const room = await chatRepository.reopenRoom(roomId);
        io.to(roomId).emit('room:reopened', { roomId, room });
      } catch { socket.emit('error', { message: 'Failed to reopen' }); }
    });

    // ── Delete message ───────────────────────────────────────────────────
    socket.on('message:delete', async ({ messageId, roomId }) => {
      try {
        const deleted = await chatRepository.deleteMessage(messageId, userId);
        if (!deleted) return socket.emit('error', { message: 'Not found or unauthorized' });
        io.to(roomId).emit('message:deleted', { messageId });
      } catch { socket.emit('error', { message: 'Failed to delete' }); }
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  return io;
};

const isUserOnline = (userId) => onlineUsers.has(userId);
module.exports = { initSocket, isUserOnline, onlineUsers };

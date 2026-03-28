const Message  = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

class ChatRepository {

  _supportRoomId(userId) { return `support_${userId}`; }
  _aiRoomId(userId)      { return `ai_${userId}`; }

  async findOrCreateRoom(userId, type = 'support') {
    const roomId = type === 'ai' ? this._aiRoomId(userId) : this._supportRoomId(userId);
    let room = await ChatRoom.findOne({ roomId }).populate('patient','name email avatar');
    if (!room) {
      room = await ChatRoom.create({ roomId, type, patient: userId, status: 'open' });
      room = await ChatRoom.findOne({ roomId }).populate('patient','name email avatar');
    }
    return room;
  }

  async findRoomByRoomId(roomId) {
    return ChatRoom.findOne({ roomId }).populate('patient','name email avatar');
  }

  async findRoomByPatient(userId, type = 'support') {
    const roomId = type === 'ai' ? this._aiRoomId(userId) : this._supportRoomId(userId);
    return ChatRoom.findOne({ roomId }).populate('patient','name email avatar');
  }

  async findAllRooms({ page=1, limit=20, status, type } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    const skip = (Number(page)-1) * Number(limit);
    const [rooms, total] = await Promise.all([
      ChatRoom.find(filter).populate('patient','name email avatar').sort({ updatedAt:-1 }).skip(skip).limit(Number(limit)),
      ChatRoom.countDocuments(filter),
    ]);
    return { rooms, total };
  }

  async updateRoomLastMessage(roomId, content, senderId, senderRole) {
    return ChatRoom.findOneAndUpdate(
      { roomId },
      {
        'lastMessage.content':    content.slice(0,120),
        'lastMessage.sender':     senderId,
        'lastMessage.senderRole': senderRole,
        'lastMessage.createdAt':  new Date(),
        $inc: { messageCount: 1 },
      },
      { new: true }
    );
  }

  async incrementUnread(roomId, senderRole) {
    const field = senderRole === 'patient' ? 'unreadCountAdmin' : 'unreadCountPatient';
    return ChatRoom.findOneAndUpdate({ roomId }, { $inc: { [field]: 1 } }, { new: true });
  }

  async markRoomRead(roomId, role) {
    const field = role === 'admin' ? 'unreadCountAdmin' : 'unreadCountPatient';
    return ChatRoom.findOneAndUpdate({ roomId }, { $set: { [field]: 0 } }, { new: true });
  }

  async closeRoom(roomId, closedBy = null) {
    return ChatRoom.findOneAndUpdate({ roomId }, { status:'closed', closedAt: new Date(), closedBy }, { new: true });
  }

  async reopenRoom(roomId) {
    return ChatRoom.findOneAndUpdate({ roomId }, { status:'open', closedAt: null, closedBy: null }, { new: true });
  }

  async saveMessage({ room, sender, senderRole, content, type='text', chatType='support', metadata=null }) {
    return Message.create({ room, sender, senderRole, content, type, chatType, metadata });
  }

  async getMessages(roomId, { page=1, limit=50 } = {}) {
    const skip = (Number(page)-1) * Number(limit);
    const [messages, total] = await Promise.all([
      Message.find({ room: roomId, isDeleted: false })
        .populate('sender','name avatar role')
        .sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      Message.countDocuments({ room: roomId }),
    ]);
    return { messages: messages.reverse(), total };
  }

  async deleteMessage(messageId, userId) {
    return Message.findOneAndUpdate({ _id: messageId, sender: userId }, { isDeleted: true }, { new: true });
  }

  async markMessagesRead(roomId, userId) {
    const unread = await Message.find({ room: roomId, sender: { $ne: userId }, 'readBy.user': { $ne: userId } }).select('_id');
    if (!unread.length) return;
    await Message.updateMany(
      { _id: { $in: unread.map(m => m._id) } },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );
  }

  // For Admin User Deep View
  async getAllMessagesByUser(userId, { page=1, limit=30, chatType } = {}) {
    const filter = {
      $or: [{ room: `support_${userId}` }, { room: `ai_${userId}` }, { sender: userId }],
      isDeleted: false,
    };
    if (chatType) filter.chatType = chatType;
    const skip = (Number(page)-1) * Number(limit);
    const [messages, total] = await Promise.all([
      Message.find(filter).populate('sender','name avatar role').sort({ createdAt:-1 }).skip(skip).limit(Number(limit)),
      Message.countDocuments(filter),
    ]);
    return { messages, total };
  }

  async getChatStats() {
    const [totalRooms, openRooms, totalMessages, aiMessages, supportMessages] = await Promise.all([
      ChatRoom.countDocuments(),
      ChatRoom.countDocuments({ status:'open' }),
      Message.countDocuments({ isDeleted: false }),
      Message.countDocuments({ chatType:'ai',      isDeleted: false }),
      Message.countDocuments({ chatType:'support', isDeleted: false }),
    ]);
    return { totalRooms, openRooms, totalMessages, aiMessages, supportMessages };
  }
}

module.exports = new ChatRepository();

const chatRepository = require('../repositories/chatRepository');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');
const { ApiError } = require('../middlewares/errorHandler');

class ChatController {

  // ── Patient ───────────────────────────────────────────────────────────

  async getMyRoom(req, res, next) {
    try {
      const room = await chatRepository.findOrCreateRoom(req.user.id, 'support');
      return sendSuccess(res, 200, 'Chat room retrieved', room);
    } catch (err) { next(err); }
  }

  async getMyMessages(req, res, next) {
    try {
      const room = await chatRepository.findRoomByPatient(req.user.id, 'support');
      if (!room) return sendSuccess(res, 200, 'No messages', { messages:[], total:0 });
      const { page=1, limit=50 } = req.query;
      const { messages, total }  = await chatRepository.getMessages(room.roomId, { page, limit });
      await chatRepository.markMessagesRead(room.roomId, req.user.id);
      await chatRepository.markRoomRead(room.roomId, 'patient');
      return sendSuccess(res, 200, 'Messages retrieved', messages, getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  // AI chat rooms
  async getMyAiRoom(req, res, next) {
    try {
      const room = await chatRepository.findOrCreateRoom(req.user.id, 'ai');
      return sendSuccess(res, 200, 'AI room retrieved', room);
    } catch (err) { next(err); }
  }

  async getMyAiMessages(req, res, next) {
    try {
      const room = await chatRepository.findRoomByPatient(req.user.id, 'ai');
      if (!room) return sendSuccess(res, 200, 'No AI messages', { messages:[], total:0 });
      const { page=1, limit=50 } = req.query;
      const { messages, total }  = await chatRepository.getMessages(room.roomId, { page, limit });
      return sendSuccess(res, 200, 'AI messages retrieved', messages, getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  // ── Admin ─────────────────────────────────────────────────────────────

  async getAllRooms(req, res, next) {
    try {
      const { page=1, limit=20, status, type } = req.query;
      const { rooms, total } = await chatRepository.findAllRooms({ page, limit, status, type });
      return sendSuccess(res, 200, 'Rooms retrieved', rooms, getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  async getRoomMessages(req, res, next) {
    try {
      const room = await chatRepository.findRoomByRoomId(req.params.roomId);
      if (!room) throw new ApiError(404, 'Room not found');
      const { page=1, limit=50 } = req.query;
      const { messages, total }  = await chatRepository.getMessages(req.params.roomId, { page, limit });
      await chatRepository.markMessagesRead(req.params.roomId, req.user.id);
      await chatRepository.markRoomRead(req.params.roomId, 'admin');
      return sendSuccess(res, 200, 'Messages retrieved', messages, getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  async getChatStats(req, res, next) {
    try {
      const stats = await chatRepository.getChatStats();
      return sendSuccess(res, 200, 'Chat stats', stats);
    } catch (err) { next(err); }
  }

  async closeRoom(req, res, next) {
    try {
      const room = await chatRepository.closeRoom(req.params.roomId, req.user.id);
      if (!room) throw new ApiError(404, 'Room not found');
      return sendSuccess(res, 200, 'Room closed', room);
    } catch (err) { next(err); }
  }

  async reopenRoom(req, res, next) {
    try {
      const room = await chatRepository.reopenRoom(req.params.roomId);
      if (!room) throw new ApiError(404, 'Room not found');
      return sendSuccess(res, 200, 'Room reopened', room);
    } catch (err) { next(err); }
  }
}

module.exports = new ChatController();

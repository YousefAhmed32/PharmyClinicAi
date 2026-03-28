const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/chatController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

// Patient
router.get('/my-room',             ctrl.getMyRoom);
router.get('/my-room/messages',    ctrl.getMyMessages);
router.get('/my-ai-room',          ctrl.getMyAiRoom);
router.get('/my-ai-room/messages', ctrl.getMyAiMessages);

// Admin
router.use(restrictTo('admin'));
router.get('/admin/stats',                          ctrl.getChatStats);
router.get('/admin/rooms',                          ctrl.getAllRooms);
router.get('/admin/rooms/:roomId/messages',         ctrl.getRoomMessages);
router.patch('/admin/rooms/:roomId/close',          ctrl.closeRoom);
router.patch('/admin/rooms/:roomId/reopen',         ctrl.reopenRoom);

module.exports = router;

const express      = require('express');
const router       = express.Router();
const Notification = require('../models/Notification');
const { protect }  = require('../middlewares/auth');
const { ApiError } = require('../middlewares/errorHandler');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');

// All notification routes require auth
router.use(protect);

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { userId: req.user.id };
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user.id, isRead: false }),
    ]);

    return sendSuccess(res, 200, 'Notifications retrieved', notifications, {
      ...getPaginationMeta(total, page, limit),
      unreadCount,
    });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return next(new ApiError(404, 'Notification not found'));
    return sendSuccess(res, 200, 'Marked as read', notif);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    return sendSuccess(res, 200, 'All notifications marked as read');
  } catch (err) { next(err); }
});

/**
 * DELETE /api/notifications/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    return sendSuccess(res, 200, 'Deleted');
  } catch (err) { next(err); }
});

/**
 * DELETE /api/notifications
 * Clear all notifications
 */
router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    return sendSuccess(res, 200, 'All notifications cleared');
  } catch (err) { next(err); }
});

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    return sendSuccess(res, 200, 'Unread count', { count });
  } catch (err) { next(err); }
});

module.exports = router;

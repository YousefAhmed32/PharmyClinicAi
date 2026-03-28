const Notification = require('../models/Notification');

/**
 * Create a notification in DB and emit via Socket.io
 * @param {object} io           - Socket.io server instance (can be null)
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} params.type  - order | prescription | appointment | stock | chat | system
 * @param {string} params.link  - frontend route
 * @param {object} params.meta  - extra data
 */
const createNotification = async (io, { userId, title, message, type = 'system', link = null, meta = {} }) => {
  try {
    const notif = await Notification.create({ userId, title, message, type, link, meta });

    // Emit real-time to the specific user's room
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notif);
    }

    return notif;
  } catch (err) {
    console.error('❌ Notification creation failed:', err.message);
    return null;
  }
};

/**
 * Bulk notify all admins
 */
const notifyAdmins = async (io, User, { title, message, type, link, meta }) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    const notifications = await Notification.insertMany(
      admins.map(a => ({ userId: a._id, title, message, type, link: link || null, meta: meta || {} }))
    );

    if (io) {
      io.to('admin-room').emit('notification:new', { title, message, type, link });
    }

    return notifications;
  } catch (err) {
    console.error('❌ Admin notification failed:', err.message);
    return [];
  }
};

module.exports = { createNotification, notifyAdmins };

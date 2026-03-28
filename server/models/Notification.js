const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
      index: true,
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['order', 'prescription', 'appointment', 'stock', 'chat', 'system'],
      default: 'system',
    },
    isRead:  { type: Boolean, default: false, index: true },
    link:    { type: String, default: null },   // frontend route
    meta:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;

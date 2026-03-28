const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    // "support_{userId}" | "ai_{userId}"
    roomId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    type: {
      type:    String,
      enum:    ['support', 'ai'],
      default: 'support',
      index:   true,
    },

    patient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    status: {
      type:    String,
      enum:    ['open', 'closed'],
      default: 'open',
      index:   true,
    },

    // Snapshot of last message for list view
    lastMessage: {
      content:   { type: String,  default: null },
      senderRole:{ type: String,  default: null },
      createdAt: { type: Date,    default: null },
    },

    messageCount:       { type: Number, default: 0 },
    unreadCountPatient: { type: Number, default: 0, min: 0 },
    unreadCountAdmin:   { type: Number, default: 0, min: 0 },

    // AI-specific: store session context summary
    aiContextSummary: { type: String, default: null },

    closedAt:  { type: Date, default: null },
    closedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

chatRoomSchema.index({ patient: 1, type: 1 });
chatRoomSchema.index({ type: 1, status: 1 });
chatRoomSchema.index({ updatedAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
module.exports = ChatRoom;

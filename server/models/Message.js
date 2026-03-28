const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Room identifier:
    // Support: "support_{userId}"
    // AI:      "ai_{userId}"
    room: {
      type:     String,
      required: true,
      index:    true,
    },

    // Chat type
    chatType: {
      type:    String,
      enum:    ['support', 'ai'],
      default: 'support',
      index:   true,
    },

    // null sender = AI assistant
    sender: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    senderRole: {
      type:    String,
      enum:    ['patient', 'admin', 'ai'],
      required: true,
    },

    content: {
      type:      String,
      required:  [true, 'Message content is required'],
      trim:      true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
    },

    type: {
      type:    String,
      enum:    ['text', 'system', 'product_suggestion', 'doctor_escalation', 'emergency'],
      default: 'text',
    },

    // For AI product suggestions — store product refs
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    readBy: [
      {
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        if (ret.isDeleted) ret.content = '[Message deleted]';
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageSchema.index({ room: 1, createdAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ chatType: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;

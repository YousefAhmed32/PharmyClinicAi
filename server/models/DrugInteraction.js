const mongoose = require('mongoose');

const drugInteractionSchema = new mongoose.Schema(
  {
    drug1: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // generic name only — e.g. "warfarin"
    },
    drug2: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    recommendation: {
      type: String,
      trim: true,
      default: null,
    },
    mechanism: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { transform(doc, ret) { delete ret.__v; return ret; } },
  }
);

// Compound index — order-independent pair lookup
drugInteractionSchema.index({ drug1: 1, drug2: 1 }, { unique: true });
drugInteractionSchema.index({ drug1: 1 });
drugInteractionSchema.index({ drug2: 1 });

const DrugInteraction = mongoose.model('DrugInteraction', drugInteractionSchema);
module.exports = DrugInteraction;

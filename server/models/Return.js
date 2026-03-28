const mongoose = require('mongoose');

// ── Per-item status tracking ──────────────────────────────────────────────
const returnItemSchema = new mongoose.Schema(
  {
    product:     { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:        { type: String, required: true, trim: true },
    image:       { type: String, default: null },
    price:       { type: Number, required: true, min: 0 },
    orderedQty:  { type: Number, required: true, min: 1 },  // original qty in order
    returnedQty: { type: Number, required: true, min: 1 },  // qty requested for return
    unit:        { type: String, default: 'piece' },
    unitLabel:   { type: String, default: 'piece' },

    // Per-item reason (can differ per item)
    reason: {
      type: String,
      enum: ['wrong_product','damaged','expired','not_as_described','changed_mind','other'],
      required: true,
    },
    reasonDetails: { type: String, trim: true, default: null, maxlength: 500 },

    // ── Per-item admin decision ───────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
      index:   true,
    },
    adminNote:        { type: String, trim: true, default: null },
    rejectionReason:  { type: String, trim: true, default: null },
    stockRestored:    { type: Boolean, default: false },
    decidedAt:        { type: Date,    default: null },
    decidedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true }
);

// ── Validate returnedQty ≤ orderedQty ─────────────────────────────────────
returnItemSchema.pre('validate', function (next) {
  if (this.returnedQty > this.orderedQty) {
    return next(new Error(
      `returnedQty (${this.returnedQty}) cannot exceed orderedQty (${this.orderedQty})`
    ));
  }
  next();
});

// ── Main return schema ────────────────────────────────────────────────────
const returnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type:     String,
      unique:   true,
      required: true,
      index:    true,
    },

    order: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Order',
      required: true,
      index:    true,
    },

    patient: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // Array of items being returned (partial = not all items)
    items: {
      type: [returnItemSchema],
      validate: {
        validator: v => Array.isArray(v) && v.length > 0,
        message:   'Return must include at least one item',
      },
    },

    // Overall return status (derived from items, but stored for quick filter)
    status: {
      type:    String,
      enum:    ['pending', 'partially_approved', 'approved', 'rejected', 'received', 'refunded', 'closed'],
      default: 'pending',
      index:   true,
    },

    // Admin-level fields
    adminNotes:   { type: String, trim: true, default: null },
    refundAmount: { type: Number, min: 0, default: 0 },
    refundMethod: {
      type:    String,
      enum:    ['cash', 'credit_card', 'wallet', null],
      default: null,
    },

    // Flags
    allStockRestored: { type: Boolean, default: false },

    // Lifecycle timestamps
    reviewedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    closedAt:   { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
returnSchema.index({ patient: 1, createdAt: -1 });
returnSchema.index({ status:  1, createdAt: -1 });
returnSchema.index({ order:   1 });

// ── Virtuals ───────────────────────────────────────────────────────────────
returnSchema.virtual('totalReturnedItems').get(function () {
  return this.items.reduce((s, i) => s + i.returnedQty, 0);
});

returnSchema.virtual('approvedItemsCount').get(function () {
  return this.items.filter(i => i.status === 'approved').length;
});

returnSchema.virtual('pendingItemsCount').get(function () {
  return this.items.filter(i => i.status === 'pending').length;
});

returnSchema.virtual('isPartial').get(function () {
  const statuses = new Set(this.items.map(i => i.status));
  return statuses.size > 1;
});

// ── Auto-compute overall status from item statuses ─────────────────────────
returnSchema.methods.computeStatus = function () {
  const statuses = this.items.map(i => i.status);
  const allApproved  = statuses.every(s => s === 'approved');
  const allRejected  = statuses.every(s => s === 'rejected');
  const anyApproved  = statuses.some(s => s === 'approved');
  const anyPending   = statuses.some(s => s === 'pending');

  if (anyPending)                   return 'pending';
  if (allApproved)                  return 'approved';
  if (allRejected)                  return 'rejected';
  if (anyApproved && !anyPending)   return 'partially_approved';
  return this.status;
};

// ── Auto-compute refund amount from approved items ─────────────────────────
returnSchema.methods.computeRefundAmount = function () {
  return parseFloat(
    this.items
      .filter(i => i.status === 'approved')
      .reduce((s, i) => s + i.price * i.returnedQty, 0)
      .toFixed(2)
  );
};

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;

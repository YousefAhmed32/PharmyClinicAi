const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:      { type: String, required: true, trim: true },
    image:     { type: String, default: null },
    price:     { type: Number, required: true, min: 0 },
    quantity:  { type: Number, required: true, min: 1 },
    unit:      { type: String, default: 'piece' },
    unitLabel: { type: String, default: 'piece' },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone:    { type: String, required: true, trim: true },
    street:   { type: String, required: true, trim: true },
    city:     { type: String, required: true, trim: true },
    state:    { type: String, default: '', trim: true },
    zip:      { type: String, default: '', trim: true },
    country:  { type: String, default: 'Egypt', trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    note:      { type: String, default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ORDER_STATUSES = [
  'pending', 'reviewing', 'confirmed', 'processing',
  'ready_for_pickup', 'out_for_delivery', 'delivered',
  'cancelled', 'rejected', 'returned', 'refunded',
];

const orderSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, sparse: true, default: null },
    orderNumber:   { type: String, unique: true, required: true, index: true },

    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: v => Array.isArray(v) && v.length > 0,
        message: 'Order must have at least one item',
      },
    },

    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: {
      type:    String,
      enum:    ['cash_on_delivery', 'credit_card', 'debit_card', 'wallet'],
      default: 'cash_on_delivery',
    },
    paymentStatus: {
      type:    String,
      enum:    ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    status: {
      type:    String,
      enum:    ORDER_STATUSES,
      default: 'pending',
      index:   true,
    },

    subtotal:     { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    discount:     { type: Number, default: 0, min: 0 },
    total:        { type: Number, required: true, min: 0 },

    notes:       { type: String, trim: true, default: null },
    adminNotes:  { type: String, trim: true, default: null },

    rejectionReason: { type: String, trim: true, default: null },
    returnReason:    { type: String, trim: true, default: null },

    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── Link to Return documents (partial returns supported) ──────────────
    returns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Return' }],
    hasActiveReturn: { type: Boolean, default: false, index: true },

    confirmedAt:  { type: Date, default: null },
    shippedAt:    { type: Date, default: null },
    deliveredAt:  { type: Date, default: null },
    cancelledAt:  { type: Date, default: null },
    returnedAt:   { type: Date, default: null },
    refundedAt:   { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((s, i) => s + i.quantity, 0);
});

orderSchema.virtual('isCancellable').get(function () {
  return ['pending', 'reviewing', 'confirmed'].includes(this.status);
});

orderSchema.virtual('isReturnable').get(function () {
  return this.status === 'delivered';
});

// Auto invoice number
orderSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.models.Order.countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;

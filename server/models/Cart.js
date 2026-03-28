const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Product',
      required: true,
    },
    quantity: {
      type:    Number,
      required: true,
      min:     [1, 'Quantity must be at least 1'],
      default: 1,
    },
    price: {
      type:     Number,
      required: true,
      min:      [0, 'Price must be ≥ 0'],
    },
    // Snapshot of unit info at time of adding
    unit:      { type: String, default: 'piece' },
    unitLabel: { type: String, default: 'قطعة' },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null }, // if product has variants
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
      index:    true,
    },
    items: {
      type:    [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

// ── Virtuals ───────────────────────────────────────────────────────────────
cartSchema.virtual('totalItems').get(function () {
  return this.items.reduce((s, i) => s + i.quantity, 0);
});

cartSchema.virtual('subtotal').get(function () {
  return parseFloat(
    this.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)
  );
});

cartSchema.virtual('isEmpty').get(function () {
  return this.items.length === 0;
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;

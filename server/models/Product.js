const mongoose = require('mongoose');

// ── Unit variant sub-schema ───────────────────────────────────────────────
const unitVariantSchema = new mongoose.Schema(
  {
    unit: {
      type: String,
      required: true,
      trim: true,
      enum: ['piece','strip','box','bottle','vial','sachet','tube','pack']
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    comparePrice: {
      type: Number,
      min: 0,
      default: null
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    barcode: {
      type: String,
      trim: true,
      default: null
    },
    sku: {
      type: String,
      trim: true,
      default: null
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    itemsPerUnit: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    // ── Core ────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Min 2 chars'],
      maxlength: [200, 'Max 200 chars'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Min 10 chars'],
      maxlength: [2000, 'Max 2000 chars'],
    },

    // ── Identity ─────────────────────────────────────────
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: null
    },

    genericName: {
      type: String,
      trim: true,
      default: null
    },

    alternatives: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    ],

    // ── Pricing ──────────────────────────────────────────
    price: {
      type: Number,
      required: true,
      min: 0
    },

    comparePrice: {
      type: Number,
      min: 0,
      default: null
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    // ── Variants ─────────────────────────────────────────
    hasVariants: {
      type: Boolean,
      default: false
    },

    variants: {
      type: [unitVariantSchema],
      default: []
    },

    unit: {
      type: String,
      default: 'piece',
      enum: ['piece','strip','box','bottle','vial','sachet','tube','pack']
    },

    unitLabel: {
      type: String,
      default: 'قطعة',
      trim: true
    },

    unitsPerBox: {
      type: Number,
      default: 1,
      min: 1
    },

    // ── Expiry ───────────────────────────────────────────
    expiryDate: {
      type: Date,
      default: null
    },

    // ── Category ─────────────────────────────────────────
    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'vitamins',
        'supplements',
        'skincare',
        'medicines',
        'equipment',
        'babycare',
        'personal-care',
        'other'
      ],
    },

    // ── Media ────────────────────────────────────────────
    image: {
      type: String,
      default: null
    },

    // ── Meta ─────────────────────────────────────────────
    sku: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    tags: {
      type: [String],
      default: []
    },

    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes (clean) ─────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', genericName: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

// ── Virtuals ────────────────────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

productSchema.virtual('inStock').get(function () {
  if (this.hasVariants && this.variants.length > 0) {
    return this.variants.some(v => v.stock > 0);
  }
  return this.stock > 0;
});

productSchema.virtual('totalStock').get(function () {
  if (this.hasVariants && this.variants.length > 0) {
    return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  return this.stock;
});

productSchema.virtual('effectivePrice').get(function () {
  if (this.hasVariants && this.variants.length > 0) {
    const def = this.variants.find(v => v.isDefault) || this.variants[0];
    return def ? def.price : this.price;
  }
  return this.price;
});

productSchema.virtual('isExpired').get(function () {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
});

// ── Pre-save hooks ─────────────────────────────────────

// ✅ Auto SKU generator
productSchema.pre('save', function (next) {
  if (!this.sku) {
    this.sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// ✅ Ensure one default variant
productSchema.pre('save', function (next) {
  if (this.hasVariants && this.variants.length > 0) {
    const defaults = this.variants.filter(v => v.isDefault);

    if (defaults.length === 0) {
      this.variants[0].isDefault = true;
    } else if (defaults.length > 1) {
      this.variants.forEach((v, i) => (v.isDefault = i === 0));
    }
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
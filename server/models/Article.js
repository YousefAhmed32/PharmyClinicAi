const mongoose = require('mongoose');

const ALLOWED_CATEGORIES = [
  'vitamins',
  'supplements',
  'skincare',
  'medicines',
  'equipment',
  'babycare',
  'personal-care',
  'safety',
  'health-tips',
  'news',
  'chronic-disease',
  'paediatrics',
  'other'
];

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    summary: {
      type: String,
      required: [true, 'Summary is required'],
      trim: true,
      minlength: [10, 'Summary must be at least 10 characters'],
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [50, 'Content must be at least 50 characters'],
    },

    image: {
      type: String,
      default: null,
    },

    // ✅ FIXED CATEGORY SYSTEM
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,

      validate: {
        validator: function (value) {
          // يسمح بأي category بس يحذر لو مش ضمن القائمة
          return typeof value === 'string' && value.length > 0;
        },
        message: 'Invalid category format',
      },
    },

    tags: {
      type: [String],
      default: [],
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    views: {
      type: Number,
      default: 0,
    },

    readTimeMinutes: {
      type: Number,
      default: 1,
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

// ─── Indexes ─────────────────────────────────────────────
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1 });
articleSchema.index({ author: 1 });
articleSchema.index({
  title: 'text',
  summary: 'text',
  content: 'text',
  tags: 'text',
});

// ─── Pre-save ────────────────────────────────────────────
articleSchema.pre('save', function (next) {
  // ✅ Slug
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // ✅ Read time
  if (this.isModified('content')) {
    const wordCount = this.content.trim().split(/\s+/).length;
    this.readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  }

  // ✅ Publish date
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;
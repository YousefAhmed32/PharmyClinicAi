const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      minlength: [2,   'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      index:     true,
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8,   'Password must be at least 8 characters'],
      select:    false,
    },
    role: {
      type:    String,
      enum:    ['patient', 'admin'],
      default: 'patient',
      index:   true,
    },
    phone:  { type: String, trim: true, default: null },
    address: {
      street:  { type: String, trim: true, default: null },
      city:    { type: String, trim: true, default: null },
      state:   { type: String, trim: true, default: null },
      zip:     { type: String, trim: true, default: null },
      country: { type: String, trim: true, default: 'Egypt' },
    },
    avatar: { type: String, default: null },

    // ── Preferences ──────────────────────────────────────────────────────
    language: {
      type:    String,
      enum:    ['ar', 'en'],
      default: 'ar',
    },

    // ── Status ───────────────────────────────────────────────────────────
    isActive:          { type: Boolean, default: true, index: true },
    lastLogin:         { type: Date,    default: null },
    lastActivity:      { type: Date,    default: null },
    passwordChangedAt: { type: Date,    default: null },

    // ── Auth tokens ───────────────────────────────────────────────────────
    refreshTokens: {
      type:    [String],
      select:  false,
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActivity: -1 });

// ── Pre-save: hash password ───────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

// ── Methods ───────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    return this.passwordChangedAt.getTime() / 1000 > jwtIssuedAt;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;

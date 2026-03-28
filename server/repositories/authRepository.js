const User = require('../models/User');

class AuthRepository {
  /**
   * Find user by email (includes password for auth checks)
   */
  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password +refreshTokens');
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    return User.findById(id);
  }

  /**
   * Find user by ID including refresh tokens
   */
  async findByIdWithTokens(id) {
    return User.findById(id).select('+refreshTokens');
  }

  /**
   * Create a new user
   */
  async create(userData) {
    return User.create(userData);
  }

  /**
   * Add a refresh token to user's token list
   */
  async addRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $push: { refreshTokens: token } },
      { new: true }
    );
  }

  /**
   * Remove a specific refresh token (logout)
   */
  async removeRefreshToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { refreshTokens: token } },
      { new: true }
    );
  }

  /**
   * Remove all refresh tokens (logout all devices)
   */
  async removeAllRefreshTokens(userId) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { refreshTokens: [] } },
      { new: true }
    );
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId) {
    return User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  /**
   * Update user profile fields
   */
  async updateProfile(userId, updates) {
    return User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
  }

  /**
   * Check if email is already taken (excluding a specific user)
   */
  async emailExists(email, excludeId = null) {
    const query = { email };
    if (excludeId) query._id = { $ne: excludeId };
    return User.exists(query);
  }

  /**
   * Get all users (admin usage)
   */
  async findAll({ page = 1, limit = 10, role, search } = {}) {
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total };
  }

  /**
   * Soft-deactivate a user
   */
  async deactivate(userId) {
    return User.findByIdAndUpdate(userId, { isActive: false }, { new: true });
  }
}

module.exports = new AuthRepository();

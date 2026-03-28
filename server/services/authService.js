const authRepository = require('../repositories/authRepository');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} = require('../utils/jwt');
const { ApiError } = require('../middlewares/errorHandler');

class AuthService {
  /**
   * Register a new patient user
   */
  async register(userData) {
    const { name, email, password, phone } = userData;

    // Check email uniqueness
    const emailTaken = await authRepository.emailExists(email);
    if (emailTaken) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    // Create user (password hashed by pre-save hook)
    const user = await authRepository.create({ name, email, password, phone });

    // Issue tokens
    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Persist refresh token
    await authRepository.addRefreshToken(user._id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login with email + password
   */
  async login(email, password) {
    // 1. Find user with password field
    const user = await authRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // 2. Check account is active
    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    }

    // 3. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // 4. Issue tokens
    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // 5. Persist refresh token + update last login
    await Promise.all([
      authRepository.addRefreshToken(user._id, refreshToken),
      authRepository.updateLastLogin(user._id),
    ]);

    // Return user without sensitive fields
    const safeUser = await authRepository.findById(user._id);
    return { user: safeUser, accessToken, refreshToken };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshTokens(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new ApiError(401, 'Refresh token is required');
    }

    // 1. Verify refresh token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    // 2. Find user and validate stored token (rotation check)
    const user = await authRepository.findByIdWithTokens(decoded.sub);
    if (!user || !user.refreshTokens.includes(incomingRefreshToken)) {
      // Possible token reuse — revoke all tokens
      if (user) await authRepository.removeAllRefreshTokens(user._id);
      throw new ApiError(401, 'Refresh token reuse detected. Please log in again.');
    }

    // 3. Rotate refresh token
    await authRepository.removeRefreshToken(user._id, incomingRefreshToken);

    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await authRepository.addRefreshToken(user._id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout — invalidate refresh token
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      await authRepository.removeRefreshToken(userId, refreshToken);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await authRepository.removeAllRefreshTokens(userId);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedFields = ['name', 'phone', 'address', 'avatar'];
    const filtered = {};
    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) filtered[field] = updates[field];
    });

    const updated = await authRepository.updateProfile(userId, filtered);
    if (!updated) throw new ApiError(404, 'User not found');
    return updated;
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findByEmailWithPassword(
      (await authRepository.findById(userId)).email
    );

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();

    // Invalidate all sessions after password change
    await authRepository.removeAllRefreshTokens(userId);
  }

  /**
   * Admin: get all users
   */
  async getAllUsers(queryParams) {
    return authRepository.findAll(queryParams);
  }
}

module.exports = new AuthService();

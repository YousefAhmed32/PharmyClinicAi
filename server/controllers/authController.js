const authService = require('../services/authService');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');

class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);

      return sendSuccess(res, 201, 'Registration successful', {
        user,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);

      return sendSuccess(res, 200, 'Login successful', {
        user,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);

      return sendSuccess(res, 200, 'Token refreshed successfully', tokens);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.id, refreshToken);

      return sendSuccess(res, 200, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout-all
   */
  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.id);
      return sendSuccess(res, 200, 'Logged out from all devices');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return sendSuccess(res, 200, 'Profile retrieved', user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/auth/me
   */
  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, 200, 'Profile updated successfully', user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
    } catch (err) {
      next(err);
    }
  }

  // ─── Admin endpoints ───────────────────────────────────────────────────────

  /**
   * GET /api/auth/users  (admin only)
   */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      const { users, total } = await authService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        role,
        search,
      });

      return sendSuccess(
        res,
        200,
        'Users retrieved successfully',
        users,
        getPaginationMeta(total, page, limit)
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();

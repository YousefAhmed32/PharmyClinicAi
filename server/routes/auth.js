const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/auth');
const { validate } = require('../utils/validator');
const { authLimiter } = require('../middlewares/rateLimiter');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require('../utils/authValidation');

// ─── Public routes ─────────────────────────────────────────────────────────
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login',    authLimiter, validate(loginSchema),    authController.login);
router.post('/refresh',  validate(refreshTokenSchema),          authController.refresh);

// ─── Protected routes (any authenticated user) ────────────────────────────
router.post('/logout',     protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);

router.get('/me',    protect, authController.getProfile);
router.patch('/me',  protect, validate(updateProfileSchema), authController.updateProfile);

router.patch(
  '/change-password',
  protect,
  validate(changePasswordSchema),
  authController.changePassword
);

// ─── Admin only routes ─────────────────────────────────────────────────────
router.get('/users', protect, restrictTo('admin'), authController.getAllUsers);

module.exports = router;

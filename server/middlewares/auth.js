const { verifyAccessToken } = require('../utils/jwt');
const { ApiError } = require('./errorHandler');
const User = require('../models/User');

/**
 * protect — verifies JWT access token and attaches user to req.user
 * Usage: router.get('/profile', protect, handler)
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Access denied. No token provided.'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new ApiError(401, 'Access denied. Malformed token.'));
    }

    // 2. Verify token
    const decoded = verifyAccessToken(token);

    // 3. Check user still exists and is active
    const user = await User.findById(decoded.sub).select('+passwordChangedAt');
    if (!user) {
      return next(new ApiError(401, 'User no longer exists.'));
    }

    if (!user.isActive) {
      return next(new ApiError(403, 'Your account has been deactivated. Contact support.'));
    }

    // 4. Check if password was changed after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return next(new ApiError(401, 'Password was recently changed. Please log in again.'));
    }

    // 5. Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (err) {
    next(err); // JWT errors are handled by errorHandler middleware
  }
};

/**
 * restrictTo — role-based access control (RBAC)
 * Usage: router.delete('/:id', protect, restrictTo('admin'), handler)
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  if (!roles.includes(req.user.role)) {
    return next(
      new ApiError(403, `Access denied. Required role(s): ${roles.join(', ')}`)
    );
  }

  next();
};

/**
 * optionalAuth — attaches user if token present, but does NOT block unauthenticated requests
 * Useful for public routes that behave differently for logged-in users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    req.user = user
      ? { id: user._id.toString(), email: user.email, role: user.role, name: user.name }
      : null;

    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { protect, restrictTo, optionalAuth };

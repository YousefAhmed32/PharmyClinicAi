const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'pharmyclinic',
    audience: 'pharmyclinic-client',
  });
};

/**
 * Generate a long-lived refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'pharmyclinic',
    audience: 'pharmyclinic-client',
  });
};

/**
 * Verify an access token — throws if invalid/expired
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'pharmyclinic',
    audience: 'pharmyclinic-client',
  });
};

/**
 * Verify a refresh token — throws if invalid/expired
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'pharmyclinic',
    audience: 'pharmyclinic-client',
  });
};

/**
 * Build the token payload from a user document
 */
const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  email: user.email,
  role: user.role,
  name: user.name,
});

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  buildTokenPayload,
};

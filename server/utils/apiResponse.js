/**
 * Standardized success response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {*} data - Response payload
 * @param {object} meta - Optional pagination or extra metadata
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...(meta !== null && { meta }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Standardized error response (use sparingly — prefer errorHandler middleware)
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = []) => {
  const response = {
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Pagination helper — returns meta object for list responses
 * @param {number} total - Total documents count
 * @param {number} page - Current page
 * @param {number} limit - Documents per page
 */
const getPaginationMeta = (total, page, limit) => ({
  total,
  page: Number(page),
  limit: Number(limit),
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = { sendSuccess, sendError, getPaginationMeta };

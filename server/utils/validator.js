const Joi = require('joi');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Middleware factory — validates req.body against a Joi schema
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,      // Return all errors, not just first
    stripUnknown: true,     // Remove unknown fields
    convert: true,          // Type coercion (e.g., "123" → 123)
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(new ApiError(422, 'Validation failed', errors));
  }

  // Replace body with sanitized/coerced values
  req.body = value;
  next();
};

/**
 * Validate query params
 */
const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return next(new ApiError(422, 'Invalid query parameters', errors));
  }

  req.query = value;
  next();
};

// ─── Common Joi schemas ───────────────────────────────────────────────────────

const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': 'Invalid ID format' });

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional(),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = { validate, validateQuery, objectIdSchema, paginationSchema };

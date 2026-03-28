const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required',
    }),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[\d\s\-().]{7,20}$/)
    .optional()
    .allow('', null),
  address: Joi.object({
    street: Joi.string().trim().optional().allow('', null),
    city:   Joi.string().trim().optional().allow('', null),
    state:  Joi.string().trim().optional().allow('', null),
    zip:    Joi.string().trim().optional().allow('', null),
  }).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
};

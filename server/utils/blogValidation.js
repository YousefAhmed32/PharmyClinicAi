const Joi = require('joi');

const BLOG_CATEGORIES = [
  'health-tips', 'medications', 'nutrition',
  'diseases', 'wellness', 'news', 'other',
];

const createArticleSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required().messages({
    'any.required': 'Title is required',
    'string.min': 'Title must be at least 5 characters',
  }),
  summary: Joi.string().trim().min(10).max(500).required().messages({
    'any.required': 'Summary is required',
  }),
  content: Joi.string().min(50).required().messages({
    'any.required': 'Content is required',
    'string.min': 'Content must be at least 50 characters',
  }),
  category: Joi.string().valid(...BLOG_CATEGORIES).required().messages({
    'any.required': 'Category is required',
    'any.only': `Category must be one of: ${BLOG_CATEGORIES.join(', ')}`,
  }),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).default([]),
  status: Joi.string().valid('draft', 'published').default('draft'),
});

const updateArticleSchema = Joi.object({
  title:    Joi.string().trim().min(5).max(200).optional(),
  summary:  Joi.string().trim().min(10).max(500).optional(),
  content:  Joi.string().min(50).optional(),
  category: Joi.string().valid(...BLOG_CATEGORIES).optional(),
  tags:     Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
  status:   Joi.string().valid('draft', 'published').optional(),
});

const blogQuerySchema = Joi.object({
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(50).default(9),
  category: Joi.string().valid(...BLOG_CATEGORIES).optional(),
  search:   Joi.string().trim().optional(),
  tag:      Joi.string().trim().optional(),
  status:   Joi.string().valid('draft', 'published').optional(),
});

module.exports = { createArticleSchema, updateArticleSchema, blogQuerySchema };

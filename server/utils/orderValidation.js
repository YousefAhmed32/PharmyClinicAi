const Joi = require('joi');

const VALID_STATUSES = [
  'pending','reviewing','confirmed','processing',
  'ready_for_pickup','out_for_delivery',
  'delivered','cancelled','rejected','returned','refunded',
];

const checkoutSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().required(),
    phone:    Joi.string().trim().required(),
    street:   Joi.string().trim().required(),
    city:     Joi.string().trim().required(),
    state:    Joi.string().trim().allow('', null).default(''),
    zip:      Joi.string().trim().allow('', null).default(''),
    country:  Joi.string().trim().default('Egypt'),
  }).required(),
  paymentMethod: Joi.string()
    .valid('cash_on_delivery','credit_card','debit_card','wallet')
    .default('cash_on_delivery'),
  notes: Joi.string().trim().max(500).allow('', null).optional(),
});

const updateOrderStatusSchema = Joi.object({
  status:     Joi.string().valid(...VALID_STATUSES).required(),
  note:       Joi.string().trim().max(500).allow('', null).optional(),
  reason:     Joi.string().trim().max(500).allow('', null).optional(),
  adminNotes: Joi.string().trim().max(1000).allow('', null).optional(),
});

const orderQuerySchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
  .valid(...VALID_STATUSES, 'all', '')
  .empty('')
  ,
  search: Joi.string()
  .trim()
  .allow('')
  .empty('')
  ,
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
});

// Re-export cart schemas too (used from same file in some places)
const addToCartSchema = Joi.object({
  productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  quantity:  Joi.number().integer().min(1).default(1),
  variantId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null, '').optional(),
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});

module.exports = {
  checkoutSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  addToCartSchema,
  updateCartItemSchema,
};

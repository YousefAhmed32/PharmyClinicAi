const Joi = require('joi');

const unitVariantSchema = Joi.object({
  unit:         Joi.string().trim().required(),
  label:        Joi.string().trim().required(),
  price:        Joi.number().min(0).required(),
  comparePrice: Joi.number().min(0).allow(null).default(null),
  stock:        Joi.number().min(0).required(),
  barcode:      Joi.string().trim().allow('', null).default(null),
  sku:          Joi.string().trim().allow('', null).default(null),
  isDefault:    Joi.boolean().default(false),
  itemsPerUnit: Joi.number().min(1).default(1),
});

const createProductSchema = Joi.object({
  name:         Joi.string().trim().min(2).max(200).required(),
  description:  Joi.string().trim().min(10).max(2000).required(),
  category:     Joi.string().valid('vitamins','supplements','skincare','medicines','equipment','babycare','personal-care','other').required(),
  price:        Joi.number().min(0).when('hasVariants', { is: true, then: Joi.optional(), otherwise: Joi.required() }),
  comparePrice: Joi.number().min(0).allow(null).default(null),
  stock:        Joi.number().min(0).when('hasVariants', { is: true, then: Joi.optional(), otherwise: Joi.required() }),
  // Unit
  hasVariants:  Joi.boolean().default(false),
  variants:     Joi.array().items(unitVariantSchema).when('hasVariants', { is: true, then: Joi.array().min(1).required(), otherwise: Joi.array().default([]) }),
  unit:         Joi.string().default('piece'),
  unitLabel:    Joi.string().default('قطعة'),
  // Identity
  barcode:      Joi.string().trim().allow('', null).default(null),
  genericName:  Joi.string().trim().allow('', null).default(null),
  sku:          Joi.string().trim().allow('', null).default(null),
  expiryDate:   Joi.date().allow(null).default(null),
  // Meta
  isFeatured:   Joi.boolean().default(false),
  isActive:     Joi.boolean().default(true),
  tags:         Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).default([]),
});

const updateProductSchema = Joi.object({
  name:         Joi.string().trim().min(2).max(200),
  description:  Joi.string().trim().min(10).max(2000),
  category:     Joi.string().valid('vitamins','supplements','skincare','medicines','equipment','babycare','personal-care','other'),
  price:        Joi.number().min(0),
  comparePrice: Joi.number().min(0).allow(null),
  stock:        Joi.number().min(0),
  hasVariants:  Joi.boolean(),
  variants:     Joi.array().items(unitVariantSchema),
  unit:         Joi.string(),
  unitLabel:    Joi.string(),
  barcode:      Joi.string().trim().allow('', null),
  genericName:  Joi.string().trim().allow('', null),
  sku:          Joi.string().trim().allow('', null),
  expiryDate:   Joi.date().allow(null),
  isFeatured:   Joi.boolean(),
  isActive:     Joi.boolean(),
  tags:         Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
});

module.exports = { createProductSchema, updateProductSchema };

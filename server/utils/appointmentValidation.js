const Joi = require('joi');

const SERVICES = [
  'general-consultation',
  'prescription-review',
  'medication-counseling',
  'blood-pressure-check',
  'diabetes-management',
  'vaccination',
  'lab-results-review',
  'other',
];

const bookAppointmentSchema = Joi.object({
  doctorName: Joi.string().trim().min(2).max(100).required().messages({
    'any.required': 'Doctor name is required',
  }),
  service: Joi.string().valid(...SERVICES).required().messages({
    'any.required': 'Service type is required',
    'any.only': `Service must be one of: ${SERVICES.join(', ')}`,
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Date is required',
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    }),
  timeSlot: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .required()
    .messages({
      'any.required': 'Time slot is required',
      'string.pattern.base': 'Time slot must be in HH:MM format',
    }),
  notes: Joi.string().trim().max(1000).optional().allow('', null),
});

const cancelAppointmentSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional().allow('', null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'completed', 'cancelled', 'no-show')
    .required()
    .messages({ 'any.required': 'Status is required' }),
  adminNotes: Joi.string().trim().max(1000).optional().allow('', null),
});

const slotsQuerySchema = Joi.object({
  date:       Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  doctorName: Joi.string().trim().required(),
});

const appointmentQuerySchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(10),
  status:     Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled', 'no-show').optional(),
  date:       Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  doctorName: Joi.string().trim().optional(),
  patientId:  Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
});

module.exports = {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateStatusSchema,
  slotsQuerySchema,
  appointmentQuerySchema,
};

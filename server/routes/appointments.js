const express = require('express');
const router = express.Router();

const appointmentController = require('../controllers/appointmentController');
const { protect, restrictTo } = require('../middlewares/auth');
const { validate, validateQuery } = require('../utils/validator');
const {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateStatusSchema,
  slotsQuerySchema,
  appointmentQuerySchema,
} = require('../utils/appointmentValidation');

// ─── Public (no auth needed) ───────────────────────────────────────────────
router.get('/slots',   validateQuery(slotsQuerySchema), appointmentController.getAvailableSlots);
router.get('/doctors',                                  appointmentController.getDoctors);

// ─── Patient routes (auth required) ───────────────────────────────────────
router.use(protect);

router.post('/',              validate(bookAppointmentSchema),   appointmentController.bookAppointment);
router.get('/my',                                                appointmentController.getMyAppointments);
router.get('/my/:id',                                           appointmentController.getMyAppointment);
router.patch('/my/:id/cancel', validate(cancelAppointmentSchema), appointmentController.cancelMyAppointment);

// ─── Admin routes ──────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

router.get('/admin',                  validateQuery(appointmentQuerySchema), appointmentController.getAllAppointments);
router.get('/admin/stats',                                                   appointmentController.getStats);
router.get('/admin/:id',                                                     appointmentController.getAppointmentById);
router.patch('/admin/:id/status',     validate(updateStatusSchema),          appointmentController.updateStatus);
router.delete('/admin/:id',                                                  appointmentController.deleteAppointment);

module.exports = router;

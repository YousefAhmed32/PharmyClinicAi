const appointmentService = require('../services/appointmentService');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');

class AppointmentController {
  // ─── Public ────────────────────────────────────────────────────────────────

  /** GET /api/appointments/slots?date=YYYY-MM-DD&doctorName=... */
  async getAvailableSlots(req, res, next) {
    try {
      const { date, doctorName } = req.query;
      const result = await appointmentService.getAvailableSlots(date, doctorName);
      return sendSuccess(res, 200, 'Available slots retrieved', result);
    } catch (err) { next(err); }
  }

  /** GET /api/appointments/doctors */
  async getDoctors(req, res, next) {
    try {
      const doctors = await appointmentService.getDoctors();
      return sendSuccess(res, 200, 'Doctors list retrieved', doctors);
    } catch (err) { next(err); }
  }

  // ─── Patient ───────────────────────────────────────────────────────────────

  /** POST /api/appointments */
  async bookAppointment(req, res, next) {
    try {
      const appointment = await appointmentService.bookAppointment(req.user.id, req.body);
      return sendSuccess(res, 201, 'Appointment booked successfully', appointment);
    } catch (err) { next(err); }
  }

  /** GET /api/appointments/my */
  async getMyAppointments(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const { appointments, total } = await appointmentService.getMyAppointments(
        req.user.id,
        { page: Number(page), limit: Number(limit), status }
      );
      return sendSuccess(
        res, 200, 'Your appointments retrieved', appointments,
        getPaginationMeta(total, page, limit)
      );
    } catch (err) { next(err); }
  }

  /** GET /api/appointments/my/:id */
  async getMyAppointment(req, res, next) {
    try {
      const appt = await appointmentService.getMyAppointment(req.params.id, req.user.id);
      return sendSuccess(res, 200, 'Appointment retrieved', appt);
    } catch (err) { next(err); }
  }

  /** PATCH /api/appointments/my/:id/cancel */
  async cancelMyAppointment(req, res, next) {
    try {
      const { reason } = req.body;
      const appt = await appointmentService.cancelMyAppointment(
        req.params.id, req.user.id, reason
      );
      return sendSuccess(res, 200, 'Appointment cancelled', appt);
    } catch (err) { next(err); }
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  /** GET /api/appointments/admin */
  async getAllAppointments(req, res, next) {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const { appointments, total } = await appointmentService.getAllAppointments({
        page: Number(page), limit: Number(limit), ...filters,
      });
      return sendSuccess(
        res, 200, 'All appointments retrieved', appointments,
        getPaginationMeta(total, page, limit)
      );
    } catch (err) { next(err); }
  }

  /** GET /api/appointments/admin/stats */
  async getStats(req, res, next) {
    try {
      const stats = await appointmentService.getStats();
      return sendSuccess(res, 200, 'Appointment stats retrieved', stats);
    } catch (err) { next(err); }
  }

  /** GET /api/appointments/admin/:id */
  async getAppointmentById(req, res, next) {
    try {
      const appt = await appointmentService.getAppointmentById(req.params.id);
      return sendSuccess(res, 200, 'Appointment retrieved', appt);
    } catch (err) { next(err); }
  }

  /** PATCH /api/appointments/admin/:id/status */
  async updateStatus(req, res, next) {
    try {
      const { status, adminNotes } = req.body;
      const appt = await appointmentService.updateAppointmentStatus(
        req.params.id, status, adminNotes, req.user.id
      );
      return sendSuccess(res, 200, 'Appointment status updated', appt);
    } catch (err) { next(err); }
  }

  /** DELETE /api/appointments/admin/:id */
  async deleteAppointment(req, res, next) {
    try {
      await appointmentService.deleteAppointment(req.params.id);
      return sendSuccess(res, 200, 'Appointment deleted');
    } catch (err) { next(err); }
  }
}

module.exports = new AppointmentController();

const appointmentRepository = require('../repositories/appointmentRepository');
const {
  validateBookingDate,
  validateTimeSlot,
  getAvailableSlots,
} = require('../utils/timeSlots');
const { ApiError } = require('../middlewares/errorHandler');

class AppointmentService {
  /**
   * Get available time slots for a given date + doctor
   */
  async getAvailableSlots(date, doctorName) {
    const dateCheck = validateBookingDate(date);
    if (!dateCheck.valid) throw new ApiError(400, dateCheck.reason);

    const bookedSlots = await appointmentRepository.getBookedSlots(date, doctorName);
    const available = getAvailableSlots(date, bookedSlots);

    return {
      date,
      doctorName,
      totalSlots: available.length + bookedSlots.length,
      bookedCount: bookedSlots.length,
      availableCount: available.length,
      availableSlots: available,
    };
  }

  /**
   * Book a new appointment
   */
  async bookAppointment(patientId, data) {
    const { doctorName, service, date, timeSlot, notes } = data;

    // 1. Validate date
    const dateCheck = validateBookingDate(date);
    if (!dateCheck.valid) throw new ApiError(400, dateCheck.reason);

    // 2. Validate time slot format
    if (!validateTimeSlot(timeSlot)) {
      throw new ApiError(400, `Invalid time slot: ${timeSlot}`);
    }

    // 3. Check slot availability
    const slotTaken = await appointmentRepository.isSlotTaken(date, timeSlot, doctorName);
    if (slotTaken) {
      throw new ApiError(409, `Time slot ${timeSlot} on ${date} is already booked for ${doctorName}`);
    }

    // 4. Prevent duplicate booking by same patient on same day/slot
    const patientAppts = await appointmentRepository.findByPatient(patientId, { limit: 100 });
    const duplicate = patientAppts.appointments.find(
      (a) =>
        a.date === date &&
        a.timeSlot === timeSlot &&
        ['pending', 'confirmed'].includes(a.status)
    );
    if (duplicate) {
      throw new ApiError(409, 'You already have an appointment at this time');
    }

    const appointment = await appointmentRepository.create({
      patient: patientId,
      doctorName,
      service,
      date,
      timeSlot,
      notes: notes || null,
    });

    return appointmentRepository.findById(appointment._id);
  }

  /**
   * Patient views their own appointments
   */
  async getMyAppointments(patientId, queryParams) {
    return appointmentRepository.findByPatient(patientId, queryParams);
  }

  /**
   * Patient views a single appointment
   */
  async getMyAppointment(appointmentId, patientId) {
    const appt = await appointmentRepository.findByIdAndPatient(appointmentId, patientId);
    if (!appt) throw new ApiError(404, 'Appointment not found');
    return appt;
  }

  /**
   * Patient cancels their appointment
   */
  async cancelMyAppointment(appointmentId, patientId, reason) {
    const appt = await appointmentRepository.findByIdAndPatient(appointmentId, patientId);
    if (!appt) throw new ApiError(404, 'Appointment not found');

    const cancellable = ['pending', 'confirmed'];
    if (!cancellable.includes(appt.status)) {
      throw new ApiError(400, `Cannot cancel appointment with status: ${appt.status}`);
    }

    // Prevent cancellation less than 1 hour before
    const apptDateTime = new Date(`${appt.date}T${appt.timeSlot}:00`);
    const now = new Date();
    const diffHours = (apptDateTime - now) / (1000 * 60 * 60);
    if (diffHours < 1) {
      throw new ApiError(400, 'Cannot cancel appointment less than 1 hour before the scheduled time');
    }

    return appointmentRepository.update(appointmentId, {
      status: 'cancelled',
      cancelledBy: 'patient',
      cancelReason: reason || null,
      cancelledAt: new Date(),
    });
  }

  // ─── Admin methods ─────────────────────────────────────────────────────────

  async getAllAppointments(queryParams) {
    return appointmentRepository.findAll(queryParams);
  }

  async getAppointmentById(id) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw new ApiError(404, 'Appointment not found');
    return appt;
  }

  async updateAppointmentStatus(id, status, adminNotes, adminId) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw new ApiError(404, 'Appointment not found');

    const validTransitions = {
      pending:   ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no-show'],
      completed: [],
      cancelled: [],
      'no-show': [],
    };

    if (!validTransitions[appt.status]?.includes(status)) {
      throw new ApiError(
        400,
        `Invalid transition: ${appt.status} → ${status}. Allowed: ${validTransitions[appt.status].join(', ') || 'none'}`
      );
    }

    const updates = {
      status,
      ...(adminNotes && { adminNotes }),
      ...(status === 'confirmed'  && { confirmedAt: new Date() }),
      ...(status === 'completed'  && { completedAt: new Date() }),
      ...(status === 'cancelled'  && { cancelledAt: new Date(), cancelledBy: 'admin' }),
    };

    return appointmentRepository.update(id, updates);
  }

  async updateAppointmentNotes(id, adminNotes) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw new ApiError(404, 'Appointment not found');
    return appointmentRepository.update(id, { adminNotes });
  }

  async deleteAppointment(id) {
    const appt = await appointmentRepository.findById(id);
    if (!appt) throw new ApiError(404, 'Appointment not found');
    return appointmentRepository.delete(id);
  }

  async getStats() {
    return appointmentRepository.getStats();
  }

  async getDoctors() {
    return appointmentRepository.getDoctors();
  }
}

module.exports = new AppointmentService();

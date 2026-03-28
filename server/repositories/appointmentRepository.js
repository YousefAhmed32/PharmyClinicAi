const Appointment = require('../models/Appointment');

class AppointmentRepository {
  /**
   * Get all booked (non-cancelled) slots for a date+doctor combo
   */
  async getBookedSlots(date, doctorName) {
    const appointments = await Appointment.find({
      date,
      doctorName,
      status: { $in: ['pending', 'confirmed'] },
    }).select('timeSlot');
    return appointments.map((a) => a.timeSlot);
  }

  /**
   * Check if a specific slot is already taken
   */
  async isSlotTaken(date, timeSlot, doctorName) {
    return Appointment.exists({
      date,
      timeSlot,
      doctorName,
      status: { $in: ['pending', 'confirmed'] },
    });
  }

  async create(data) {
    return Appointment.create(data);
  }

  async findById(id) {
    return Appointment.findById(id).populate('patient', 'name email phone');
  }

  async findByIdAndPatient(id, patientId) {
    return Appointment.findOne({ _id: id, patient: patientId })
      .populate('patient', 'name email phone');
  }

  /**
   * Patient's own appointments
   */
  async findByPatient(patientId, { page = 1, limit = 10, status } = {}) {
    const filter = { patient: patientId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient', 'name email phone')
        .sort({ date: -1, timeSlot: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Appointment.countDocuments(filter),
    ]);
    return { appointments, total };
  }

  /**
   * Admin: all appointments with filters
   */
  async findAll({ page = 1, limit = 10, status, date, doctorName, patientId } = {}) {
    const filter = {};
    if (status)     filter.status = status;
    if (date)       filter.date = date;
    if (doctorName) filter.doctorName = { $regex: doctorName, $options: 'i' };
    if (patientId)  filter.patient = patientId;

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('patient', 'name email phone')
        .sort({ date: -1, timeSlot: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Appointment.countDocuments(filter),
    ]);
    return { appointments, total };
  }

  async update(id, updates) {
    return Appointment.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('patient', 'name email phone');
  }

  async delete(id) {
    return Appointment.findByIdAndDelete(id);
  }

  /**
   * Stats for admin dashboard
   */
  async getStats() {
    const [total, byStatus, upcoming] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.countDocuments({
        date: { $gte: new Date().toISOString().split('T')[0] },
        status: { $in: ['pending', 'confirmed'] },
      }),
    ]);
    return {
      total,
      upcoming,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    };
  }

  /**
   * Get distinct doctor names for dropdown
   */
  async getDoctors() {
    return Appointment.distinct('doctorName');
  }
}

module.exports = new AppointmentRepository();

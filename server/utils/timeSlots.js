/**
 * Clinic working hours configuration
 */
const CLINIC_CONFIG = {
  startHour: 9,       // 09:00
  endHour: 17,        // 17:00 (last slot starts at 16:30)
  slotDurationMin: 30, // 30-minute slots
  workingDays: [0, 1, 2, 3, 4, 6], // Sun-Thu + Sat (0=Sun, 6=Sat); Friday off
  maxAdvanceBookingDays: 30,
  minAdvanceBookingHours: 1,
};

/**
 * Generate all possible time slots for a day
 * @returns {string[]} e.g. ["09:00","09:30","10:00",...]
 */
const generateDaySlots = () => {
  const slots = [];
  const { startHour, endHour, slotDurationMin } = CLINIC_CONFIG;
  let current = startHour * 60; // minutes from midnight
  const end = endHour * 60;

  while (current < end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += slotDurationMin;
  }
  return slots;
};

const ALL_SLOTS = generateDaySlots();

/**
 * Validate a date string (YYYY-MM-DD) for booking eligibility
 * @returns {{ valid: boolean, reason?: string }}
 */
const validateBookingDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { valid: false, reason: 'Invalid date format' };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { valid: false, reason: 'Cannot book appointments in the past' };
  if (diffDays > CLINIC_CONFIG.maxAdvanceBookingDays) {
    return { valid: false, reason: `Cannot book more than ${CLINIC_CONFIG.maxAdvanceBookingDays} days in advance` };
  }
  if (!CLINIC_CONFIG.workingDays.includes(date.getDay())) {
    return { valid: false, reason: 'Clinic is closed on this day (Friday is off)' };
  }

  return { valid: true };
};

/**
 * Validate a time slot string
 */
const validateTimeSlot = (slot) => ALL_SLOTS.includes(slot);

/**
 * Filter out past slots if the date is today
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string[]} slots - list of "HH:MM" strings
 * @returns {string[]}
 */
const filterPastSlots = (dateStr, slots) => {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr !== today) return slots;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const minMinutes = nowMinutes + CLINIC_CONFIG.minAdvanceBookingHours * 60;

  return slots.filter((slot) => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m > minMinutes;
  });
};

/**
 * Get available slots for a given date, excluding already-booked ones
 * @param {string} dateStr
 * @param {string[]} bookedSlots - slots already taken on that date
 * @returns {string[]}
 */
const getAvailableSlots = (dateStr, bookedSlots = []) => {
  const bookedSet = new Set(bookedSlots);
  const available = ALL_SLOTS.filter((s) => !bookedSet.has(s));
  return filterPastSlots(dateStr, available);
};

module.exports = {
  CLINIC_CONFIG,
  ALL_SLOTS,
  generateDaySlots,
  validateBookingDate,
  validateTimeSlot,
  getAvailableSlots,
  filterPastSlots,
};

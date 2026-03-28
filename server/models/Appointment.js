const mongoose = require('mongoose');

const DEFAULT_SERVICES = [
  'general-consultation',
  'prescription-review',
  'medication-counseling',
  'blood-pressure-check',
  'diabetes-management',
  'vaccination',
  'lab-results-review',
  'other',
];

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ✅ FIX: default بدل ما يكسر
    doctorName: {
      type: String,
      trim: true,
      default: 'Pharmacist'
    },

    service: {
      type: String,
      enum: DEFAULT_SERVICES,
      default: 'general-consultation'
    },

    // ⚠️ سيبناها string زي ما انت عامل
    date: {
      type: String,
      required: [true, 'Appointment date is required'],
    },

    timeSlot: {
      type: String,
      default: '10:00'
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: null,
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters'],
      default: null,
    },

    cancelledBy: {
      type: String,
      enum: ['patient', 'admin', null],
      default: null
    },

    cancelReason: {
      type: String,
      trim: true,
      default: null
    },

    confirmedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ─────────────────────────────────────────────
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ date: 1, timeSlot: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ createdAt: -1 });

// ─── Smart Slot Protection ───────────────────────────────
appointmentSchema.index(
  { doctorName: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed'] }
    }
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
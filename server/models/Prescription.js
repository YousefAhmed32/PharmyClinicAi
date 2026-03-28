const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
    },
    fileUrl:   { type: String, required: true },   // /uploads/prescriptions/filename
    fileType:  { type: String, enum: ['image', 'pdf'], required: true },
    fileName:  { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'responded', 'fulfilled'],
      default: 'pending',
    },
    notes:        { type: String, trim: true, default: null },  // patient notes
    adminNotes:   { type: String, trim: true, default: null },  // pharmacist response
    medicines: [                                                 // admin fills this
      {
        name:     { type: String, trim: true },
        price:    { type: Number },
        quantity: { type: Number },
        notes:    { type: String },
      },
    ],
    totalEstimate: { type: Number, default: null },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'ChatRoom',
      default: null,
    },
    reviewedAt:  { type: Date, default: null },
    respondedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1 });

const Prescription = mongoose.model('Prescription', prescriptionSchema);
module.exports = Prescription;

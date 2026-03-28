const express      = require('express');
const router       = express.Router();
const { createNotification, notifyAdmins } = require('../services/notificationService');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { protect, restrictTo } = require('../middlewares/auth');
const { ApiError }  = require('../middlewares/errorHandler');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');

// ── Multer for prescriptions ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'prescriptions');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename:    (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new ApiError(415, 'Only images and PDFs allowed'));
  },
});

// ─────────────────────────────────────────────────────────────────────────
// PATIENT routes
// ─────────────────────────────────────────────────────────────────────────

// POST /api/prescriptions/upload
router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));

    const isImage = req.file.mimetype.startsWith('image/');
    const prescription = await Prescription.create({
      patient:  req.user.id,
      fileUrl:  `/uploads/prescriptions/${req.file.filename}`,
      fileType: isImage ? 'image' : 'pdf',
      fileName: req.file.originalname,
      notes:    req.body.notes || null,
    });

    // Notify admins (socket + DB)
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('prescription:new', {
        prescriptionId: prescription._id,
        patient:        req.user.name,
        fileType:       prescription.fileType,
        time:           new Date(),
      });
    }
    await notifyAdmins(io, User, {
      title:   `New Prescription from ${req.user.name}`,
      message: `A ${prescription.fileType} prescription has been uploaded and needs review`,
      type:    'prescription',
      link:    '/admin/prescriptions',
      meta:    { prescriptionId: prescription._id },
    });

    return sendSuccess(res, 201, 'Prescription uploaded successfully', prescription);
  } catch (err) { next(err); }
});

// GET /api/prescriptions/my
router.get('/my', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const [prescriptions, total] = await Promise.all([
      Prescription.find({ patient: req.user.id })
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Prescription.countDocuments({ patient: req.user.id }),
    ]);
    return sendSuccess(res, 200, 'Prescriptions retrieved', prescriptions,
      getPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/prescriptions/my/:id
router.get('/my/:id', protect, async (req, res, next) => {
  try {
    const p = await Prescription.findOne({ _id: req.params.id, patient: req.user.id });
    if (!p) return next(new ApiError(404, 'Prescription not found'));
    return sendSuccess(res, 200, 'Prescription retrieved', p);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
// ADMIN routes
// ─────────────────────────────────────────────────────────────────────────

// GET /api/prescriptions/admin
router.get('/admin', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate('patient', 'name email phone')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Prescription.countDocuments(filter),
    ]);
    return sendSuccess(res, 200, 'Prescriptions retrieved', prescriptions,
      getPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/prescriptions/admin/stats
router.get('/admin/stats', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const [total, byStatus] = await Promise.all([
      Prescription.countDocuments(),
      Prescription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    return sendSuccess(res, 200, 'Stats retrieved', {
      total,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
    });
  } catch (err) { next(err); }
});

// GET /api/prescriptions/admin/:id
router.get('/admin/:id', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const p = await Prescription.findById(req.params.id).populate('patient', 'name email phone');
    if (!p) return next(new ApiError(404, 'Prescription not found'));
    return sendSuccess(res, 200, 'Prescription retrieved', p);
  } catch (err) { next(err); }
});

// PATCH /api/prescriptions/admin/:id/respond
router.patch('/admin/:id/respond', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { adminNotes, medicines, status } = req.body;
    const p = await Prescription.findById(req.params.id);
    if (!p) return next(new ApiError(404, 'Prescription not found'));

    const totalEstimate = medicines
      ? medicines.reduce((s, m) => s + (m.price || 0) * (m.quantity || 1), 0)
      : p.totalEstimate;

    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        adminNotes,
        medicines:      medicines || p.medicines,
        status:         status || 'responded',
        totalEstimate,
        respondedAt:    new Date(),
        ...(status === 'reviewed' && { reviewedAt: new Date() }),
      },
      { new: true }
    ).populate('patient', 'name email');

    // Notify patient via socket
    const io = req.app.get('io');
    if (io) {
      io.emit(`prescription:response:${p.patient}`, {
        prescriptionId: p._id,
        adminNotes,
        totalEstimate,
        medicines,
      });
    }

    // Notify patient
    await createNotification(req.app.get('io'), {
      userId:  p.patient.toString(),
      title:   'Prescription Response Ready 💊',
      message: 'Your pharmacist has responded to your prescription. Check the pricing.',
      type:    'prescription',
      link:    '/prescription',
    });

    return sendSuccess(res, 200, 'Response saved', updated);
  } catch (err) { next(err); }
});

module.exports = router;

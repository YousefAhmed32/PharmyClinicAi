const multer = require('multer');
const { ApiError } = require('./errorHandler');

// ─── Memory Storage (علشان sharp) ─────────────────────────
const storage = multer.memoryStorage();

// ─── File Filter ───────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        415,
        `Unsupported file type '${file.mimetype}'. Allowed: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

// ─── Uploader واحد لكل المشروع ─────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─── Delete from MongoDB (GridFS) ──────────────────────────
const { gfs } = require('../config/db');

const deleteFile = async (filename) => {
  try {
    const file = await gfs.files.findOne({ filename });
    if (!file) return;

    await gfs.remove({ _id: file._id, root: 'uploads' });
  } catch (err) {
    console.warn('⚠️ Could not delete file:', err.message);
  }
};

module.exports = {
  upload,
  deleteFile,
};
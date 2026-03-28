const express = require('express');
const router  = express.Router();

const ctrl = require('../controllers/productController');
const { protect, restrictTo } = require('../middlewares/auth');

// 👇 مهم: uploader لازم يكون memoryStorage
const { upload } = require('../middlewares/upload');
// ── Public routes (specific paths BEFORE /:id) ─────────────────────────────
router.get('/categories', ctrl.getCategories);
router.get('/featured',   ctrl.getFeatured);

// ── Admin routes (BEFORE /:id to prevent route conflict) ──────────────────
router.get('/admin/all', protect, restrictTo('admin'), ctrl.getProductsAdmin);
router.get('/admin/:id', protect, restrictTo('admin'), ctrl.getProductAdmin);

// ── Create product ────────────────────────────────────────────────────────
router.post(
  '/',
  protect,
  restrictTo('admin'),
  upload.single('image'), // 👈 memoryStorage
  ctrl.createProduct
);

// ── Update product ────────────────────────────────────────────────────────
router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  upload.single('image'), // 👈 memoryStorage
  ctrl.updateProduct
);

// ── Delete + Toggle ───────────────────────────────────────────────────────
router.delete('/:id',              protect, restrictTo('admin'), ctrl.deleteProduct);
router.patch('/:id/toggle-active', protect, restrictTo('admin'), ctrl.toggleActive);

// ── Public: list + single (AFTER admin routes) ─────────────────────────────
router.get('/',    ctrl.getProducts);
router.get('/:id', ctrl.getProduct);

module.exports = router;
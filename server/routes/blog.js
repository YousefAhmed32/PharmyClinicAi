const express = require('express');
const router = express.Router();

const blogController = require('../controllers/blogController');
const { protect, restrictTo } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload'); // ✅ التعديل هنا
const { validateQuery } = require('../utils/validator');
const { blogQuerySchema } = require('../utils/blogValidation');

// ─── Public routes ─────────────────────────────────────────
router.get('/categories', blogController.getCategories);
router.get('/', validateQuery(blogQuerySchema), blogController.getArticles);

// ─── Admin routes ──────────────────────────────────────────
router.get('/admin/all', protect, restrictTo('admin'), validateQuery(blogQuerySchema), blogController.getAllArticles);
router.get('/admin/stats', protect, restrictTo('admin'), blogController.getStats);
router.get('/admin/:id', protect, restrictTo('admin'), blogController.getArticleById);

router.post(
  '/',
  protect,
  restrictTo('admin'),
  upload.single('image'), // ✅ بدل blogImageUploader
  blogController.createArticle
);

router.put(
  '/:id',
  protect,
  restrictTo('admin'),
  upload.single('image'), // ✅ نفس التعديل
  blogController.updateArticle
);

router.delete('/:id', protect, restrictTo('admin'), blogController.deleteArticle);
router.patch('/:id/publish', protect, restrictTo('admin'), blogController.publishArticle);
router.patch('/:id/unpublish', protect, restrictTo('admin'), blogController.unpublishArticle);

// ─── Public slug route ─────────────────────────────────────
router.get('/:slug', blogController.getArticleBySlug);

module.exports = router;
const express  = require('express');
const router   = express.Router();
const Product  = require('../models/Product');
const { protect, restrictTo } = require('../middlewares/auth');
const { ApiError } = require('../middlewares/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');

// All barcode routes → admin only
router.use(protect, restrictTo('admin'));

/**
 * GET /api/barcode/:barcode
 * Look up a product by barcode
 * Returns: { found: true, product } OR { found: false }
 */
router.get('/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;
    if (!barcode || barcode.trim().length < 3) {
      return next(new ApiError(400, 'Barcode must be at least 3 characters'));
    }

    const product = await Product.findOne({ barcode: barcode.trim(), isActive: true })
      .populate('createdBy', 'name')
      .populate('alternatives', 'name price barcode');

    if (product) {
      return sendSuccess(res, 200, 'Product found', { found: true, product });
    }

    return sendSuccess(res, 200, 'Product not found for this barcode', { found: false, barcode });
  } catch (err) { next(err); }
});

/**
 * POST /api/barcode/assign
 * Assign a barcode to an existing product
 * Body: { productId, barcode }
 */
router.post('/assign', async (req, res, next) => {
  try {
    const { productId, barcode } = req.body;
    if (!productId || !barcode) {
      return next(new ApiError(400, 'productId and barcode are required'));
    }

    // Check uniqueness
    const existing = await Product.findOne({ barcode: barcode.trim() });
    if (existing && existing._id.toString() !== productId) {
      return next(new ApiError(409, `Barcode already assigned to: ${existing.name}`));
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { barcode: barcode.trim() },
      { new: true, runValidators: true }
    );

    if (!product) return next(new ApiError(404, 'Product not found'));

    return sendSuccess(res, 200, 'Barcode assigned successfully', product);
  } catch (err) { next(err); }
});

/**
 * POST /api/barcode/quick-create
 * Create a minimal product from a scanned barcode
 * Body: { barcode, name, price, stock, category }
 */
router.post('/quick-create', async (req, res, next) => {
  try {
    const { barcode, name, price, stock, category, genericName, description } = req.body;

    if (!barcode || !name || price === undefined || stock === undefined || !category) {
      return next(new ApiError(400, 'barcode, name, price, stock, category are required'));
    }

    // Check duplicate barcode
    const duplicate = await Product.findOne({ barcode: barcode.trim() });
    if (duplicate) {
      return next(new ApiError(409, `Barcode already in use: ${duplicate.name}`));
    }

    const product = await Product.create({
      barcode:     barcode.trim(),
      name:        name.trim(),
      description: description || `${name} — added via barcode scan`,
      price:       Number(price),
      stock:       Number(stock),
      category,
      genericName: genericName || null,
      createdBy:   req.user.id,
    });

    return sendSuccess(res, 201, 'Product created via barcode', product);
  } catch (err) { next(err); }
});

module.exports = router;

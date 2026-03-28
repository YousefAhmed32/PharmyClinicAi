const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/auth');
const { validate, validateQuery } = require('../utils/validator');
const {
  checkoutSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} = require('../utils/orderValidation');

// All order routes require authentication
router.use(protect);

// ─── Patient routes ────────────────────────────────────────────────────────
router.post('/checkout',               validate(checkoutSchema),       orderController.checkout);
router.get('/my-orders',                                               orderController.getMyOrders);
router.get('/my-orders/:id',                                           orderController.getMyOrder);
router.patch('/my-orders/:id/cancel',                                  orderController.cancelMyOrder);

// ─── Admin routes ──────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

router.get('/admin',                   validateQuery(orderQuerySchema), orderController.getAllOrders);
router.get('/admin/stats',                                             orderController.getStats);
router.get('/admin/statuses',                                          orderController.getStatuses);
router.get('/admin/:id',                                               orderController.getOrderById);
router.patch('/admin/:id/status',      validate(updateOrderStatusSchema), orderController.updateStatus);

module.exports = router;

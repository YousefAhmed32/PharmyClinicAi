const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const { protect } = require('../middlewares/auth');
const { ApiError } = require('../middlewares/errorHandler');
const { sendSuccess } = require('../utils/apiResponse');

// ── Sequential invoice number generator ──────────────────────────────────
const generateInvoiceNumber = async () => {
  // Find highest existing invoice number
  const last = await Order.findOne(
    { invoiceNumber: { $exists: true, $ne: null } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }
  );

  let next = 1;
  if (last?.invoiceNumber) {
    const num = parseInt(last.invoiceNumber.replace('INV-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }

  return `INV-${String(next).padStart(6, '0')}`;
};

/**
 * GET /api/invoice/:orderId
 * Returns full invoice data for an order.
 * Generates & saves invoiceNumber on first call.
 * Accessible by: the order's patient OR any admin.
 */
router.get('/:orderId', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'name email phone address');

    if (!order) return next(new ApiError(404, 'Order not found'));

    // Auth: patient can only see their own invoices
    const isOwner = order.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return next(new ApiError(403, 'Access denied'));

    // Generate invoice number if not yet assigned
    if (!order.invoiceNumber) {
      const invoiceNumber = await generateInvoiceNumber();
      order.invoiceNumber = invoiceNumber;
      await order.save();
    }

    // Build invoice payload
    const invoice = {
      invoiceNumber: order.invoiceNumber,
      orderId:       order._id,
      orderNumber:   order.orderNumber,
      // Customer
      customer: {
        name:    order.user.name,
        email:   order.user.email,
        phone:   order.shippingAddress.phone || order.user.phone || '',
        address: {
          street:  order.shippingAddress.street,
          city:    order.shippingAddress.city,
          state:   order.shippingAddress.state,
          zip:     order.shippingAddress.zip,
          country: order.shippingAddress.country,
        },
      },
      // Pharmacy
      pharmacy: {
        name:    'PharmaClinic',
        address: '123 Health Street, Cairo, Egypt',
        phone:   '+20 100 000 0001',
        email:   'info@pharmyclinic.com',
        website: 'www.pharmyclinic.com',
      },
      // Items
      items: order.items.map(item => ({
        name:     item.name,
        quantity: item.quantity,
        price:    item.price,
        subtotal: +(item.price * item.quantity).toFixed(2),
      })),
      // Totals
      subtotal:     order.subtotal,
      shippingCost: order.shippingCost,
      discount:     order.discount || 0,
      total:        order.total,
      // Payment
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      // Status
      orderStatus: order.status,
      // Dates
      issuedAt:  order.createdAt,
      printedAt: new Date(),
      // Policy
      returnPolicy: 'Products can be returned within 24 hours if unopened and in original condition.',
    };

    return sendSuccess(res, 200, 'Invoice generated', invoice);
  } catch (err) { next(err); }
});

module.exports = router;

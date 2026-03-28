const express  = require('express');
const router   = express.Router();
const Return   = require('../models/Return');
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const { protect, restrictTo } = require('../middlewares/auth');
const { ApiError }             = require('../middlewares/errorHandler');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const User = require('../models/User');

router.use(protect);

// ── Helpers ───────────────────────────────────────────────────────────────
const VALID_REASONS = [
  'wrong_product','damaged','expired','not_as_described','changed_mind','other',
];

async function generateReturnNumber() {
  const last = await Return.findOne({}, { returnNumber:1 }, { sort:{ createdAt:-1 } }).lean();
  let next = 1;
  if (last?.returnNumber) {
    const n = parseInt(last.returnNumber.replace('RET-',''), 10);
    if (!isNaN(n)) next = n + 1;
  }
  return `RET-${String(next).padStart(6,'0')}`;
}

// ── Recompute + save overall return status ─────────────────────────────────
async function syncReturnStatus(ret) {
  ret.status        = ret.computeStatus();
  ret.refundAmount  = ret.computeRefundAmount();
  await ret.save();
  return ret;
}

// ─────────────────────────────────────────────────────────────────────────
//  PATIENT — POST /api/returns
//  Create a PARTIAL or FULL return request
//  Body: {
//    orderId,
//    items: [{ productId, returnedQty, reason, reasonDetails? }],
//  }
// ─────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { orderId, items } = req.body;

    if (!orderId)       return next(new ApiError(400, 'orderId is required'));
    if (!items?.length) return next(new ApiError(400, 'At least one item is required'));

    // Validate each item has required fields
    for (const item of items) {
      if (!item.productId)    return next(new ApiError(400, 'productId required per item'));
      if (!item.returnedQty || item.returnedQty < 1)
        return next(new ApiError(400, 'returnedQty ≥ 1 required per item'));
      if (!item.reason || !VALID_REASONS.includes(item.reason))
        return next(new ApiError(400, `Invalid reason: ${item.reason}. Valid: ${VALID_REASONS.join(', ')}`));
    }

    // Fetch order — must belong to user and be delivered
    const order = await Order.findOne({ _id: orderId, user: req.user.id })
      .populate('items.product', 'name image price unit unitLabel');
    if (!order)
      return next(new ApiError(404, 'Order not found or does not belong to your account'));
    if (order.status !== 'delivered')
      return next(new ApiError(400, `Cannot return an order with status: ${order.status}. Must be delivered.`));

    // Block if active return already exists for the SAME items
    const existingActive = await Return.findOne({
      order:  orderId,
      status: { $in: ['pending', 'partially_approved'] },
    });
    if (existingActive) {
      return next(new ApiError(409,
        `An active return (${existingActive.returnNumber}) already exists for this order`
      ));
    }

    // Build return items — cross-validate against order
    const returnItems = [];
    for (const ri of items) {
      const orderItem = order.items.find(
        i => (i.product?._id || i.product).toString() === ri.productId.toString()
      );
      if (!orderItem)
        return next(new ApiError(400, `Product ${ri.productId} not found in this order`));
      if (ri.returnedQty > orderItem.quantity)
        return next(new ApiError(400,
          `Return qty (${ri.returnedQty}) exceeds ordered qty (${orderItem.quantity}) for ${orderItem.name}`
        ));

      returnItems.push({
        product:       (orderItem.product?._id || orderItem.product).toString(),
        name:          orderItem.name,
        image:         orderItem.image  || null,
        price:         orderItem.price,
        orderedQty:    orderItem.quantity,
        returnedQty:   Number(ri.returnedQty),
        unit:          orderItem.unit      || 'piece',
        unitLabel:     orderItem.unitLabel || 'piece',
        reason:        ri.reason,
        reasonDetails: ri.reasonDetails?.trim() || null,
        status:        'pending',
      });
    }

    const returnNumber = await generateReturnNumber();

    const ret = await Return.create({
      returnNumber,
      order:       orderId,
      patient:     req.user.id,
      items:       returnItems,
      status:      'pending',
      refundAmount: 0, // will be computed after admin approves items
    });

    // Mark order as having active return
    await Order.findByIdAndUpdate(orderId, { hasActiveReturn: true });

    // Notify admins
    const io = req.app.get('io');
    await notifyAdmins(io, User, {
      title:   `↩️ New Return: ${returnNumber}`,
      message: `${req.user.name} requested return of ${returnItems.length} item(s) from ${order.orderNumber}`,
      type:    'order',
      link:    '/admin/returns',
    }).catch(() => {});

    return sendSuccess(res, 201, 'Return request submitted successfully', ret);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  PATIENT — GET /api/returns/my
// ─────────────────────────────────────────────────────────────────────────
router.get('/my', async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [returns, total] = await Promise.all([
      Return.find({ patient: req.user.id })
        .populate('order', 'orderNumber total createdAt')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit).lean(),
      Return.countDocuments({ patient: req.user.id }),
    ]);

    return sendSuccess(res, 200, 'Returns retrieved', returns,
      getPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  PATIENT — GET /api/returns/my/:id
// ─────────────────────────────────────────────────────────────────────────
router.get('/my/:id', async (req, res, next) => {
  try {
    const ret = await Return.findOne({ _id: req.params.id, patient: req.user.id })
      .populate('order', 'orderNumber total createdAt shippingAddress')
      .lean();
    if (!ret) return next(new ApiError(404, 'Return not found'));
    return sendSuccess(res, 200, 'Return retrieved', ret);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────
router.use(restrictTo('admin'));

// GET /api/returns/admin/stats  ← MUST be before /admin/:id
router.get('/admin/stats', async (req, res, next) => {
  try {
    const [total, byStatus, byReason, refundAgg, pendingCount] = await Promise.all([
      Return.countDocuments(),
      Return.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Return.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Return.aggregate([
        { $match: { status: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$refundAmount' } } },
      ]),
      Return.countDocuments({ status: { $in: ['pending', 'partially_approved'] } }),
    ]);

    return sendSuccess(res, 200, 'Stats retrieved', {
      total,
      pending:      pendingCount,
      byStatus:     byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      byReason,
      totalRefunds: refundAgg[0]?.total || 0,
    });
  } catch (err) { next(err); }
});

// GET /api/returns/admin
router.get('/admin', async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 12;
    const status = req.query.status || null;
    const search = req.query.search?.trim() || '';
    const skip   = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (search) filter.returnNumber = { $regex: search, $options: 'i' };

    const [returns, total] = await Promise.all([
      Return.find(filter)
        .populate('patient', 'name email phone')
        .populate('order',   'orderNumber total')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Return.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Returns retrieved', returns,
      getPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// GET /api/returns/admin/:id
router.get('/admin/:id', async (req, res, next) => {
  try {
    const ret = await Return.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber total createdAt shippingAddress items');
    if (!ret) return next(new ApiError(404, 'Return not found'));
    return sendSuccess(res, 200, 'Return retrieved', ret);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/returns/admin/:id/items/:itemId
//  Approve or reject a SINGLE item within a return
//  Body: { decision: 'approved'|'rejected', adminNote?, rejectionReason? }
// ─────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/items/:itemId', async (req, res, next) => {
  try {
    const { decision, adminNote, rejectionReason } = req.body;

    if (!['approved','rejected'].includes(decision))
      return next(new ApiError(400, "decision must be 'approved' or 'rejected'"));

    if (decision === 'rejected' && !rejectionReason?.trim())
      return next(new ApiError(400, 'rejectionReason is required when rejecting'));

    const ret = await Return.findById(req.params.id)
      .populate('patient', 'name _id email');
    if (!ret) return next(new ApiError(404, 'Return not found'));

    // Only allow decisions on pending returns
    if (!['pending','partially_approved'].includes(ret.status))
      return next(new ApiError(400, `Cannot decide items on a return with status: ${ret.status}`));

    const item = ret.items.id(req.params.itemId);
    if (!item) return next(new ApiError(404, 'Return item not found'));
    if (item.status !== 'pending')
      return next(new ApiError(400, `Item is already ${item.status}`));

    // Apply decision to item
    item.status          = decision;
    item.adminNote       = adminNote?.trim() || null;
    item.rejectionReason = decision === 'rejected' ? rejectionReason.trim() : null;
    item.decidedAt       = new Date();
    item.decidedBy       = req.user.id;

    // Restore stock immediately when item is approved
    if (decision === 'approved' && !item.stockRestored) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.returnedQty },
      }).catch(err => console.error('Stock restore failed:', err));
      item.stockRestored = true;
    }

    // Recompute overall return status
    await syncReturnStatus(ret);

    // Notify patient about this item decision
    const io  = req.app.get('io');
    const msg = decision === 'approved'
      ? `Item "${item.name}" in return ${ret.returnNumber} was approved ✅`
      : `Item "${item.name}" in return ${ret.returnNumber} was rejected ❌`;

    await createNotification(io, {
      userId:  ret.patient._id.toString(),
      title:   decision === 'approved' ? 'Return Item Approved ✅' : 'Return Item Rejected ❌',
      message: msg,
      type:    'order',
      link:    '/returns',
    }).catch(() => {});

    return sendSuccess(res, 200, `Item ${decision} successfully`, ret);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/returns/admin/:id/bulk-decide
//  Approve or reject ALL pending items at once
//  Body: { decision: 'approved'|'rejected', adminNote?, rejectionReason? }
// ─────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/bulk-decide', async (req, res, next) => {
  try {
    const { decision, adminNote, rejectionReason } = req.body;

    if (!['approved','rejected'].includes(decision))
      return next(new ApiError(400, "decision must be 'approved' or 'rejected'"));

    if (decision === 'rejected' && !rejectionReason?.trim())
      return next(new ApiError(400, 'rejectionReason is required when rejecting all'));

    const ret = await Return.findById(req.params.id)
      .populate('patient', 'name _id email');
    if (!ret) return next(new ApiError(404, 'Return not found'));

    if (!['pending','partially_approved'].includes(ret.status))
      return next(new ApiError(400, `Cannot bulk-decide a return with status: ${ret.status}`));

    const stockOps = [];

    for (const item of ret.items) {
      if (item.status !== 'pending') continue;
      item.status          = decision;
      item.adminNote       = adminNote?.trim() || null;
      item.rejectionReason = decision === 'rejected' ? rejectionReason.trim() : null;
      item.decidedAt       = new Date();
      item.decidedBy       = req.user.id;

      if (decision === 'approved' && !item.stockRestored) {
        stockOps.push(
          Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.returnedQty },
          }).catch(e => console.error('Stock restore failed:', e))
        );
        item.stockRestored = true;
      }
    }

    if (stockOps.length) await Promise.all(stockOps);

    await syncReturnStatus(ret);

    // Notify patient
    const io = req.app.get('io');
    await createNotification(io, {
      userId:  ret.patient._id.toString(),
      title:   decision === 'approved' ? 'Return Approved ✅' : 'Return Rejected ❌',
      message: `Your return ${ret.returnNumber} was fully ${decision}`,
      type:    'order',
      link:    '/returns',
    }).catch(() => {});

    return sendSuccess(res, 200, `All items ${decision}`, ret);
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────
//  ADMIN — PATCH /api/returns/admin/:id/status
//  Move overall return to: received | refunded | closed
//  Body: { status, adminNotes?, refundMethod? }
// ─────────────────────────────────────────────────────────────────────────
router.patch('/admin/:id/status', async (req, res, next) => {
  try {
    const { status, adminNotes, refundMethod } = req.body;

    const ALLOWED_ADMIN_STATUSES = ['received','refunded','closed'];
    if (!ALLOWED_ADMIN_STATUSES.includes(status))
      return next(new ApiError(400, `status must be one of: ${ALLOWED_ADMIN_STATUSES.join(', ')}`));

    const ret = await Return.findById(req.params.id)
      .populate('patient', 'name _id email');
    if (!ret) return next(new ApiError(404, 'Return not found'));

    // Validate transition
    const validPrior = {
      received: ['approved','partially_approved'],
      refunded: ['received'],
      closed:   ['approved','partially_approved','rejected','refunded'],
    };

    if (!validPrior[status]?.includes(ret.status))
      return next(new ApiError(400,
        `Cannot move from "${ret.status}" to "${status}". Must be: ${validPrior[status].join(' or ')}`
      ));

    const updates = {
      status,
      ...(adminNotes   && { adminNotes }),
      ...(refundMethod && { refundMethod }),
      ...(status === 'received' && { receivedAt: new Date() }),
      ...(status === 'refunded' && { refundedAt: new Date() }),
      ...(status === 'closed'   && { closedAt:   new Date() }),
    };

    // Update order status when items received
    if (status === 'received') {
      await Order.findByIdAndUpdate(ret.order, {
        returnedAt: new Date(),
        $push: {
          statusHistory: {
            status: 'returned', note: `Return ${ret.returnNumber} received`,
            changedBy: req.user.id, changedAt: new Date(),
          },
        },
      });
    }

    // Update order when refunded
    if (status === 'refunded') {
      const refundAmt = ret.computeRefundAmount();
      updates.refundAmount = refundAmt;
      await Order.findByIdAndUpdate(ret.order, {
        paymentStatus: 'refunded',
        refundedAt: new Date(),
        hasActiveReturn: false,
        $push: {
          statusHistory: {
            status: 'refunded', note: `Refund ${refundAmt} EGP processed`,
            changedBy: req.user.id, changedAt: new Date(),
          },
        },
      });
    }

    if (status === 'closed') {
      await Order.findByIdAndUpdate(ret.order, { hasActiveReturn: false });
    }

    const updated = await Return.findByIdAndUpdate(
      req.params.id, updates, { new: true }
    ).populate('patient', 'name email');

    // Notify patient
    const io = req.app.get('io');
    const msgs = {
      received: { title: 'Items Received 📦', msg: `Your returned items were received` },
      refunded: { title: 'Refund Processed 💰', msg: `${updated.refundAmount} EGP refunded` },
      closed:   { title: 'Return Closed', msg: `Return ${ret.returnNumber} has been closed` },
    };
    const n = msgs[status];
    if (n) {
      await createNotification(io, {
        userId: ret.patient._id.toString(),
        title: n.title, message: n.msg, type: 'order', link: '/returns',
      }).catch(() => {});
    }

    return sendSuccess(res, 200, `Return marked as ${status}`, updated);
  } catch (err) { next(err); }
});

module.exports = router;

const express     = require('express');
const router      = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const Order       = require('../models/Order');
const Product     = require('../models/Product');
const User        = require('../models/User');
const Appointment = require('../models/Appointment');
const Return      = require('../models/Return');

router.use(protect, restrictTo('admin'));

// ── Helper: revenue-positive statuses ─────────────────────────────────────
const REVENUE_STATUSES = ['confirmed','processing','ready_for_pickup','out_for_delivery','delivered'];
const ACTIVE_STATUSES  = [...REVENUE_STATUSES, 'pending','reviewing'];

/* ─── Overview ─────────────────────────────────────────────────────────── */
router.get('/overview', async (req, res, next) => {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevE = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue, monthRevenue, prevMonthRevenue,
      totalOrders, monthOrders,
      totalUsers, newUsersMonth,
      lowStockCount, outOfStockCount,
      pendingAppts,
      ordersByStatus,
      totalReturns, pendingReturns,
    ] = await Promise.all([
      // Revenue (exclude cancelled/rejected/returned)
      Order.aggregate([{ $match: { status: { $in: REVENUE_STATUSES } } }, { $group: { _id:null, v:{ $sum:'$total' } } }]),
      Order.aggregate([{ $match: { status: { $in: REVENUE_STATUSES }, createdAt:{ $gte:start } } }, { $group: { _id:null, v:{ $sum:'$total' } } }]),
      Order.aggregate([{ $match: { status: { $in: REVENUE_STATUSES }, createdAt:{ $gte:prev, $lte:prevE } } }, { $group: { _id:null, v:{ $sum:'$total' } } }]),
      // Orders
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: start } }),
      // Users
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'patient', createdAt: { $gte: start } }),
      // Inventory
      Product.countDocuments({ stock: { $gt:0, $lte:10 }, isActive: true }),
      Product.countDocuments({ stock: 0, isActive: true }),
      // Appointments
      Appointment.countDocuments({ status: 'pending' }),
      // Orders by status breakdown
      Order.aggregate([{ $group: { _id:'$status', count:{ $sum:1 } } }]),
      // Returns
      Return.countDocuments(),
      Return.countDocuments({ status: 'pending' }),
    ]);

    const mr  = monthRevenue[0]?.v     || 0;
    const pmr = prevMonthRevenue[0]?.v || 0;
    const revenueGrowth = pmr > 0 ? (((mr - pmr) / pmr) * 100).toFixed(1) : null;

    const statusMap = ordersByStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {});
    const pendingCount = (statusMap.pending || 0) + (statusMap.reviewing || 0);

    res.json({ success: true, data: {
      revenue:   { total: totalRevenue[0]?.v || 0, thisMonth: mr, lastMonth: pmr, growth: revenueGrowth },
      orders:    {
        total: totalOrders, thisMonth: monthOrders,
        pending: pendingCount,
        ...statusMap,
        // Group for quick access
        active:    ACTIVE_STATUSES.reduce((s, k) => s + (statusMap[k] || 0), 0),
        delivered: statusMap.delivered || 0,
        cancelled: (statusMap.cancelled || 0) + (statusMap.rejected || 0),
        returned:  (statusMap.returned  || 0) + (statusMap.refunded  || 0),
      },
      users:        { total: totalUsers, newThisMonth: newUsersMonth },
      inventory:    { lowStock: lowStockCount, outOfStock: outOfStockCount },
      appointments: { pending: pendingAppts },
      returns:      { total: totalReturns, pending: pendingReturns },
    }});
  } catch (err) { next(err); }
});

/* ─── Revenue trend ────────────────────────────────────────────────────── */
router.get('/revenue', async (req, res, next) => {
  try {
    const days  = Math.min(parseInt(req.query.days) || 30, 365);
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const data = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES }, createdAt: { $gte: start } } },
      { $group: {
        _id:     { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } },
        revenue: { $sum: '$total' },
        orders:  { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    // Fill missing days with 0
    const map = data.reduce((a, d) => ({ ...a, [d._id]: d }), {});
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, revenue: map[key]?.revenue || 0, orders: map[key]?.orders || 0 });
    }

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

/* ─── Orders trend by status ───────────────────────────────────────────── */
router.get('/orders-trend', async (req, res, next) => {
  try {
    const days  = Math.min(parseInt(req.query.days) || 30, 90);
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    const data = await Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: {
        _id:    { date: { $dateToString: { format:'%Y-%m-%d', date:'$createdAt' } }, status: '$status' },
        count:  { $sum: 1 },
      }},
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ─── Top products ─────────────────────────────────────────────────────── */
router.get('/top-products', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data  = await Order.aggregate([
      { $match: { status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      { $group: {
        _id:     '$items.product',
        name:    { $first: '$items.name' },
        image:   { $first: '$items.image' },
        sold:    { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      }},
      { $sort: { sold: -1 } },
      { $limit: limit },
      { $lookup: { from:'products', localField:'_id', foreignField:'_id', as:'product' } },
      { $addFields: {
        category: { $arrayElemAt: ['$product.category', 0] },
        stock:    { $arrayElemAt: ['$product.stock',    0] },
      }},
      { $project: { product: 0 } },
    ]);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/* ─── Category breakdown ───────────────────────────────────────────────── */
router.get('/categories', async (req, res, next) => {
  try {
    const [products, sales] = await Promise.all([
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: {
          _id:        '$category',
          products:   { $sum: 1 },
          totalStock: { $sum: '$stock' },
          avgPrice:   { $avg: '$price' },
        }},
      ]),
      Order.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $unwind: '$items' },
        { $lookup: { from:'products', localField:'items.product', foreignField:'_id', as:'prod' } },
        { $addFields: { category: { $arrayElemAt: ['$prod.category', 0] } } },
        { $group: {
          _id:     '$category',
          sold:    { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price','$items.quantity'] } },
        }},
      ]),
    ]);

    const salesMap = sales.reduce((a, s) => ({ ...a, [s._id]: s }), {});
    const merged   = products.map(p => ({
      category:   p._id,
      products:   p.products,
      totalStock: p.totalStock,
      avgPrice:   Math.round(p.avgPrice * 100) / 100,
      sold:       salesMap[p._id]?.sold    || 0,
      revenue:    salesMap[p._id]?.revenue || 0,
    })).sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data: merged });
  } catch (err) { next(err); }
});

/* ─── Inventory alerts ─────────────────────────────────────────────────── */
router.get('/inventory', async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const page      = parseInt(req.query.page)      || 1;
    const limit     = parseInt(req.query.limit)     || 15;
    const skip      = (page - 1) * limit;

    const filter = { isActive: true, stock: { $lte: threshold } };
    const [products, total, outOfStock, lowStock] = await Promise.all([
      Product.find(filter).sort({ stock: 1 }).skip(skip).limit(limit).select('name category sku price stock barcode image genericName'),
      Product.countDocuments(filter),
      Product.countDocuments({ isActive: true, stock: 0 }),
      Product.countDocuments({ isActive: true, stock: { $gt: 0, $lte: threshold } }),
    ]);

    res.json({ success: true, data: { products, outOfStock, lowStock, total }, meta: {
      total, page, limit, totalPages: Math.ceil(total / limit),
    }});
  } catch (err) { next(err); }
});

/* ─── Returns analytics ────────────────────────────────────────────────── */
router.get('/returns', async (req, res, next) => {
  try {
    const days  = parseInt(req.query.days) || 30;
    const start = new Date(); start.setDate(start.getDate() - days);

    const [total, byStatus, byReason, recentTrend] = await Promise.all([
      Return.countDocuments(),
      Return.aggregate([{ $group: { _id:'$status', count:{ $sum:1 } } }]),
      Return.aggregate([{ $group: { _id:'$reason', count:{ $sum:1 } } }, { $sort:{ count:-1 } }]),
      Return.aggregate([
        { $match: { createdAt:{ $gte: start } } },
        { $group: { _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$createdAt' } }, count:{ $sum:1 }, refunds:{ $sum:'$refundAmount' } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ success: true, data: {
      total,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      byReason,
      recentTrend,
    }});
  } catch (err) { next(err); }
});

/* ─── Export ───────────────────────────────────────────────────────────── */
router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(new Date(to).setHours(23,59,59,999));

    let data = [];
    switch (type) {
      case 'orders':
        data = await Order.find(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
          .populate('user','name email phone')
          .sort({ createdAt:-1 }).limit(5000).lean();
        break;
      case 'products':
        data = await Product.find({}).sort({ category:1, name:1 }).limit(2000).lean();
        break;
      case 'users':
        data = await User.find({ role:'patient' }).sort({ createdAt:-1 }).limit(5000)
          .select('-password -refreshTokens').lean();
        break;
      case 'inventory':
        data = await Product.find({ stock:{ $lte:10 }, isActive:true }).sort({ stock:1 }).lean();
        break;
      case 'appointments':
        data = await Appointment.find(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
          .populate('patient','name email phone')
          .sort({ createdAt:-1 }).limit(5000).lean();
        break;
      case 'returns':
        data = await Return.find(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
          .populate('patient','name email phone')
          .populate('order','orderNumber total')
          .sort({ createdAt:-1 }).limit(2000).lean();
        break;
      default:
        return res.status(400).json({ success:false, message:`Unknown export type: ${type}` });
    }

    res.json({ success:true, data });
  } catch (err) { next(err); }
});

module.exports = router;

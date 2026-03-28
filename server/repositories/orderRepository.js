const Order = require('../models/Order');

const REVENUE_STATUSES = ['confirmed','processing','ready_for_pickup','out_for_delivery','delivered'];

class OrderRepository {

  async create(orderData) {
    const order = await Order.create(orderData);
    return this.findById(order._id);
  }

  async findById(id) {
    return Order.findById(id)
      .populate('user',         'name email phone')
      .populate('items.product','name image price unit unitLabel genericName')
      .populate('statusHistory.changedBy', 'name')
      .lean({ virtuals: true });
  }

  async findByIdAndUser(id, userId) {
    return Order.findOne({ _id: id, user: userId })
      .populate('user',         'name email phone')
      .populate('items.product','name image price unit unitLabel')
      .lean({ virtuals: true });
  }

  async findByUser(userId, { page = 1, limit = 10, status } = {}) {
    const filter = { user: userId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('items.product', 'name image unit unitLabel')
        .lean({ virtuals: true }),
      Order.countDocuments(filter),
    ]);
    return { orders, total };
  }

  async findAll({ page = 1, limit = 10, status, userId, search } = {}) {
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (userId)  filter.user = userId;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'name email phone')
        .lean({ virtuals: true }),
      Order.countDocuments(filter),
    ]);
    return { orders, total };
  }

  async updateStatus(id, status, note, changedBy, extraFields = {}) {
    return Order.findByIdAndUpdate(
      id,
      {
        status,
        ...extraFields,
        $push: {
          statusHistory: {
            status,
            note:      note  || null,
            changedBy: changedBy || null,
            changedAt: new Date(),
          },
        },
      },
      { new: true }
    )
    .populate('user', 'name email phone')
    .lean({ virtuals: true });
  }

  async updatePaymentStatus(id, paymentStatus) {
    return Order.findByIdAndUpdate(id, { paymentStatus }, { new: true });
  }

  async getStats() {
    const [total, byStatus, revenueData] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((a, s) => ({ ...a, [s._id]: s.count }), {}),
      revenue:  revenueData[0]?.total || 0,
    };
  }

  /**
   * Generate unique order number — uses counter with retry on conflict
   */
  async generateOrderNumber() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await Order.findOne(
        { orderNumber: { $exists: true } },
        { orderNumber: 1 },
        { sort: { createdAt: -1 } }
      );
      let next = 1;
      if (last?.orderNumber) {
        const num = parseInt(last.orderNumber.replace(/[^\d]/g, ''), 10);
        if (!isNaN(num)) next = num + 1;
      }
      const orderNumber = `ORD-${String(next).padStart(6, '0')}`;
      // Verify it doesn't exist
      const exists = await Order.findOne({ orderNumber });
      if (!exists) return orderNumber;
    }
    // Fallback: timestamp-based
    return `ORD-${Date.now()}`;
  }
}

module.exports = new OrderRepository();

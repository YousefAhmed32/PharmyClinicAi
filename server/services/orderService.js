const orderRepository   = require('../repositories/orderRepository');
const cartRepository    = require('../repositories/cartRepository');
const productRepository = require('../repositories/productRepository');
const { ApiError }      = require('../middlewares/errorHandler');
const { createNotification, notifyAdmins } = require('./notificationService');
const User = require('../models/User');

const SHIPPING_COST           = 30;
const FREE_SHIPPING_THRESHOLD = 500;

// ── Status transitions ────────────────────────────────────────────────────
const STATUS_TRANSITIONS = {
  pending:          ['reviewing', 'confirmed', 'cancelled', 'rejected'],
  reviewing:        ['confirmed', 'cancelled', 'rejected'],
  confirmed:        ['processing', 'cancelled', 'rejected'],
  processing:       ['ready_for_pickup', 'out_for_delivery', 'cancelled'],
  ready_for_pickup: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'returned'],
  delivered:        ['returned'],
  cancelled:        [],
  rejected:         [],
  returned:         ['refunded'],
  refunded:         [],
};

const STATUS_LABELS = {
  pending:          'بانتظار التأكيد',
  reviewing:        'جاري مراجعة الطلب',
  confirmed:        'تم تأكيد الطلب ✅',
  processing:       'جاري تجهيز الطلب 📦',
  ready_for_pickup: 'الطلب جاهز للاستلام 🏪',
  out_for_delivery: 'الطلب في الطريق إليك 🚚',
  delivered:        'تم توصيل الطلب 🎉',
  cancelled:        'تم إلغاء الطلب',
  rejected:         'تم رفض الطلب',
  returned:         'تم استلام المرتجع',
  refunded:         'تم استرداد المبلغ 💰',
};

// ── Checkout ──────────────────────────────────────────────────────────────
async function checkout(userId, { shippingAddress, paymentMethod, notes }, io) {
  // 1. Get cart
  const cart = await cartRepository.findByUser(userId);
  if (!cart || cart.items.length === 0)
    throw new ApiError(400, 'سلة التسوق فارغة');

  // 2. Stock validation
  const stockChecks = await productRepository.checkStockBulk(
    cart.items.map(i => ({
      productId: i.product._id?.toString() || i.product.toString(),
      quantity:  i.quantity,
    }))
  );

  const insufficient = stockChecks.filter(c => !c.sufficient);
  if (insufficient.length > 0) {
    const names = insufficient.map(c => {
      const reason = c.reason === 'not_found' ? 'غير موجود' :
                     c.reason === 'inactive'  ? 'غير متاح' :
                     `متاح: ${c.available}`;
      return `${c.product?.name || 'منتج'} (${reason})`;
    }).join(' · ');
    throw new ApiError(400, `المخزون غير كافٍ: ${names}`);
  }

  // 3. Build order items — use cart snapshot prices
  const orderItems = cart.items.map(item => ({
    product:   item.product._id,
    name:      item.product.name,
    image:     item.product.image     || null,
    price:     item.price,            // snapshot from cart
    quantity:  item.quantity,
    unit:      item.unit      || item.product.unit      || 'piece',
    unitLabel: item.unitLabel || item.product.unitLabel || 'قطعة',
  }));

  // 4. Calculate totals
  const subtotal     = parseFloat(orderItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total        = parseFloat((subtotal + shippingCost).toFixed(2));

  // 5. Create order
  const orderNumber = await orderRepository.generateOrderNumber();
  const order = await orderRepository.create({
    orderNumber,
    user:           userId,
    items:          orderItems,
    shippingAddress,
    paymentMethod:  paymentMethod || 'cash_on_delivery',
    subtotal,
    shippingCost,
    total,
    notes:          notes || null,
    statusHistory:  [{ status: 'pending', note: 'تم إنشاء الطلب', changedBy: userId }],
  });

  // 6. Decrement stock
  await Promise.all(
    orderItems.map(item =>
      productRepository.decrementStock(item.product.toString(), item.quantity)
    )
  );

  // 7. Clear cart
  await cartRepository.clearCart(userId);

  // 8. Notifications
  await createNotification(io, {
    userId,
    title:   'تم استلام طلبك! 🎉',
    message: `طلبك ${orderNumber} قيد المراجعة. الإجمالي: ${total} EGP`,
    type:    'order',
    link:    `/orders/${order._id}`,
    meta:    { orderId: order._id, orderNumber, total },
  });

  await notifyAdmins(io, User, {
    title:   `طلب جديد: ${orderNumber}`,
    message: `طلب بقيمة ${total} EGP من ${orderItems.length} منتج`,
    type:    'order',
    link:    '/admin/orders',
    meta:    { orderId: order._id, orderNumber, total },
  });

  // 9. Low stock alerts
  for (const item of orderItems) {
    const product = await productRepository.findById(item.product.toString());
    if (product && product.stock <= 10) {
      await notifyAdmins(io, User, {
        title:   `تنبيه مخزون منخفض: ${product.name}`,
        message: `متبقي ${product.stock} وحدة فقط`,
        type:    'stock',
        link:    '/admin/inventory',
        meta:    { productId: product._id, stock: product.stock },
      });
    }
  }

  return order;
}

// ── Patient: get orders ───────────────────────────────────────────────────
async function getUserOrders(userId, queryParams) {
  return orderRepository.findByUser(userId, queryParams);
}

async function getUserOrder(orderId, userId) {
  const order = await orderRepository.findByIdAndUser(orderId, userId);
  if (!order) throw new ApiError(404, 'الطلب غير موجود');
  return order;
}

// ── Patient: cancel order ─────────────────────────────────────────────────
async function cancelOrder(orderId, userId, io) {
  const order = await orderRepository.findByIdAndUser(orderId, userId);
  if (!order) throw new ApiError(404, 'الطلب غير موجود');

  if (!['pending', 'reviewing', 'confirmed'].includes(order.status)) {
    throw new ApiError(400,
      `لا يمكن إلغاء طلب بحالة: ${STATUS_LABELS[order.status] || order.status}`
    );
  }

  // Restore stock
  await Promise.all(
    order.items.map(item =>
      productRepository.incrementStock(
        item.product?._id?.toString() || item.product.toString(),
        item.quantity
      )
    )
  );

  const updated = await orderRepository.updateStatus(
    orderId, 'cancelled', 'ألغى العميل الطلب', userId,
    { cancelledAt: new Date() }
  );

  await createNotification(io, {
    userId,
    title:   'تم إلغاء طلبك',
    message: `طلبك ${order.orderNumber} تم إلغاؤه`,
    type:    'order',
    link:    `/orders/${orderId}`,
  });

  return updated;
}

// ── Admin: get all orders ─────────────────────────────────────────────────
async function getAllOrders(queryParams) {
  return orderRepository.findAll(queryParams);
}

async function getOrderById(orderId) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'الطلب غير موجود');
  return order;
}

// ── Admin: update status ──────────────────────────────────────────────────
async function updateOrderStatus(orderId, status, note, adminId, io, extra = {}) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new ApiError(404, 'الطلب غير موجود');

  const allowed = STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    const allowedLabels = allowed.map(s => STATUS_LABELS[s] || s).join(' · ');
    throw new ApiError(400,
      `لا يمكن تغيير الحالة من "${STATUS_LABELS[order.status]}" إلى "${STATUS_LABELS[status]}". ` +
      `المسموح: ${allowedLabels || 'لا شيء'}`
    );
  }

  // Restore stock on cancel / reject / return
  if (['cancelled', 'rejected', 'returned'].includes(status)) {
    await Promise.all(
      order.items.map(item =>
        productRepository.incrementStock(
          item.product?._id?.toString() || item.product.toString(),
          item.quantity
        )
      )
    );
  }

  // Timestamp fields
  const timestampFields = {
    confirmed:        { confirmedAt: new Date() },
    out_for_delivery: { shippedAt:   new Date() },
    delivered:        { deliveredAt: new Date() },
    cancelled:        { cancelledAt: new Date() },
    returned:         { returnedAt:  new Date() },
    refunded:         { refundedAt:  new Date() },
  };

  const extraFields = {
    ...(timestampFields[status] || {}),
    ...(extra.adminNotes        && { adminNotes:      extra.adminNotes }),
    ...(extra.reason            && status === 'rejected' && { rejectionReason: extra.reason }),
    ...(extra.reason            && status === 'returned' && { returnReason:    extra.reason }),
  };

  const updated = await orderRepository.updateStatus(orderId, status, note, adminId, extraFields);

  // Notify patient
  const label = STATUS_LABELS[status];
  if (label) {
    await createNotification(io, {
      userId:  order.user?._id?.toString() || order.user.toString(),
      title:   label,
      message: `طلبك ${order.orderNumber}: ${label}`,
      type:    'order',
      link:    `/orders/${orderId}`,
      meta:    { orderId, status },
    });
  }

  return updated;
}

async function getOrderStats() {
  return orderRepository.getStats();
}

module.exports = {
  checkout,
  getUserOrders,
  getUserOrder,
  cancelOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  STATUS_TRANSITIONS,
  STATUS_LABELS,
};

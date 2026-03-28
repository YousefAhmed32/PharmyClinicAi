const orderService = require('../services/orderService');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');

class OrderController {

  /** POST /api/orders/checkout */
  async checkout(req, res, next) {
    try {
      const order = await orderService.checkout(
        req.user.id, req.body, req.app.get('io')
      );
      return sendSuccess(res, 201, 'تم إنشاء الطلب بنجاح', order);
    } catch (err) { next(err); }
  }

  /** GET /api/orders/my-orders */
  async getMyOrders(req, res, next) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const { orders, total } = await orderService.getUserOrders(req.user.id, {
        page: Number(page), limit: Number(limit), status,
      });
      return sendSuccess(res, 200, 'تم جلب طلباتك', orders,
        getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  /** GET /api/orders/my-orders/:id */
  async getMyOrder(req, res, next) {
    try {
      const order = await orderService.getUserOrder(req.params.id, req.user.id);
      return sendSuccess(res, 200, 'تم جلب الطلب', order);
    } catch (err) { next(err); }
  }

  /** PATCH /api/orders/my-orders/:id/cancel */
  async cancelMyOrder(req, res, next) {
    try {
      const order = await orderService.cancelOrder(
        req.params.id, req.user.id, req.app.get('io')
      );
      return sendSuccess(res, 200, 'تم إلغاء الطلب', order);
    } catch (err) { next(err); }
  }

  /** GET /api/orders/admin */
  async getAllOrders(req, res, next) {
    try {
      const { page = 1, limit = 10, status, userId, search } = req.query;
      const { orders, total } = await orderService.getAllOrders({
        page: Number(page), limit: Number(limit), status, userId, search,
      });
      return sendSuccess(res, 200, 'تم جلب الطلبات', orders,
        getPaginationMeta(total, page, limit));
    } catch (err) { next(err); }
  }

  /** GET /api/orders/admin/stats */
  async getStats(req, res, next) {
    try {
      const stats = await orderService.getOrderStats();
      return sendSuccess(res, 200, 'إحصائيات الطلبات', stats);
    } catch (err) { next(err); }
  }

  /** GET /api/orders/admin/statuses */
  async getStatuses(req, res, next) {
    const { STATUS_LABELS, STATUS_TRANSITIONS } = orderService;
    return res.json({
      success: true,
      data: Object.entries(STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
        nextStatuses: (STATUS_TRANSITIONS[value] || []).map(s => ({
          value: s, label: STATUS_LABELS[s],
        })),
      })),
    });
  }

  /** GET /api/orders/admin/:id */
  async getOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.params.id);
      return sendSuccess(res, 200, 'تم جلب الطلب', order);
    } catch (err) { next(err); }
  }

  /** PATCH /api/orders/admin/:id/status */
  async updateStatus(req, res, next) {
    try {
      const { status, note, reason, adminNotes } = req.body;
      const order = await orderService.updateOrderStatus(
        req.params.id, status, note, req.user.id,
        req.app.get('io'), { reason, adminNotes }
      );
      return sendSuccess(res, 200, 'تم تحديث حالة الطلب', order);
    } catch (err) { next(err); }
  }
}

module.exports = new OrderController();

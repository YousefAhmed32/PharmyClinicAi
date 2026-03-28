const cartService = require('../services/cartService');
const { sendSuccess } = require('../utils/apiResponse');

class CartController {
  /** GET /api/cart */
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getCart(req.user.id);
      return sendSuccess(res, 200, 'Cart retrieved', cart);
    } catch (err) { next(err); }
  }

  /** POST /api/cart/items */
  async addItem(req, res, next) {
    try {
      const { productId, quantity } = req.body;
      const cart = await cartService.addItem(req.user.id, productId, quantity);
      return sendSuccess(res, 200, 'Item added to cart', cart);
    } catch (err) { next(err); }
  }

  /** PUT /api/cart/items/:productId */
  async updateItem(req, res, next) {
    try {
      const { quantity } = req.body;
      const cart = await cartService.updateItem(req.user.id, req.params.productId, quantity);
      return sendSuccess(res, 200, 'Cart updated', cart);
    } catch (err) { next(err); }
  }

  /** DELETE /api/cart/items/:productId */
  async removeItem(req, res, next) {
    try {
      const cart = await cartService.removeItem(req.user.id, req.params.productId);
      return sendSuccess(res, 200, 'Item removed from cart', cart);
    } catch (err) { next(err); }
  }

  /** DELETE /api/cart */
  async clearCart(req, res, next) {
    try {
      await cartService.clearCart(req.user.id);
      return sendSuccess(res, 200, 'Cart cleared');
    } catch (err) { next(err); }
  }
}

module.exports = new CartController();

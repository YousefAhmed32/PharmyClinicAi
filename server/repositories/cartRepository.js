const Cart = require('../models/Cart');

class CartRepository {

  async findByUser(userId) {
    return Cart.findOne({ user: userId })
      .populate({
        path:   'items.product',
        select: 'name price stock image isActive category unit unitLabel hasVariants variants genericName',
      });
  }

  async findOrCreate(userId) {
    let cart = await this.findByUser(userId);
    if (!cart) cart = await Cart.create({ user: userId, items: [] });
    return cart;
  }

  async save(cart) {
    return cart.save();
  }

  async clearCart(userId) {
    return Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true }
    );
  }

  async deleteCart(userId) {
    return Cart.findOneAndDelete({ user: userId });
  }
}

module.exports = new CartRepository();

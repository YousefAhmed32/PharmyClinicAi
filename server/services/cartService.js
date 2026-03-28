const cartRepository    = require('../repositories/cartRepository');
const productRepository = require('../repositories/productRepository');
const { ApiError }      = require('../middlewares/errorHandler');

class CartService {

  async getCart(userId) {
    const cart = await cartRepository.findOrCreate(userId);
    return this._sanitizeCart(cart);
  }

  /**
   * Add item to cart — checks stock, handles variants, prevents over-ordering
   */
  async addItem(userId, productId, quantity = 1, variantId = null) {
    if (!productId) throw new ApiError(400, 'productId مطلوب');
    if (quantity < 1) throw new ApiError(400, 'الكمية يجب أن تكون 1 على الأقل');

    const product = await productRepository.findActiveById(productId);
    if (!product) throw new ApiError(404, 'المنتج غير موجود أو غير متاح');

    // Resolve price + stock from variant or base product
    let effectivePrice = product.price;
    let effectiveStock = product.stock;
    let unit           = product.unit      || 'piece';
    let unitLabel      = product.unitLabel || 'قطعة';
    let resolvedVariantId = null;

    if (product.hasVariants && product.variants?.length > 0) {
      let variant = null;
      if (variantId) {
        variant = product.variants.find(v => v._id.toString() === variantId.toString());
      }
      // Fall back to default variant
      if (!variant) {
        variant = product.variants.find(v => v.isDefault) || product.variants[0];
      }
      if (variant) {
        effectivePrice    = variant.price;
        effectiveStock    = variant.stock;
        unit              = variant.unit  || unit;
        unitLabel         = variant.label || unitLabel;
        resolvedVariantId = variant._id;
      }
    }

    if (effectiveStock === 0) {
      throw new ApiError(400, `${product.name} نفد من المخزون`);
    }

    const cart = await cartRepository.findOrCreate(userId);

    // Find existing matching item
    const existingIdx = cart.items.findIndex(item => {
      const sameProduct = (item.product?._id || item.product).toString() === productId.toString();
      const sameVariant = resolvedVariantId
        ? item.variantId?.toString() === resolvedVariantId.toString()
        : !item.variantId;
      return sameProduct && sameVariant;
    });

    if (existingIdx > -1) {
      const newQty = cart.items[existingIdx].quantity + quantity;
      if (newQty > effectiveStock) {
        throw new ApiError(400,
          `لا يمكن إضافة ${quantity} وحدة. متاح ${effectiveStock} وحدة فقط (في السلة: ${cart.items[existingIdx].quantity})`
        );
      }
      cart.items[existingIdx].quantity  = newQty;
      cart.items[existingIdx].price     = effectivePrice;  // refresh price
      cart.items[existingIdx].unit      = unit;
      cart.items[existingIdx].unitLabel = unitLabel;
    } else {
      if (quantity > effectiveStock) {
        throw new ApiError(400, `متاح فقط ${effectiveStock} وحدة في المخزون`);
      }
      cart.items.push({
        product:   productId,
        quantity,
        price:     effectivePrice,
        unit,
        unitLabel,
        variantId: resolvedVariantId || null,
      });
    }

    await cartRepository.save(cart);
    return cartRepository.findByUser(userId);
  }

  /**
   * Update item quantity — validates against current stock
   */
  async updateItem(userId, productId, quantity) {
    if (quantity < 1) throw new ApiError(400, 'الكمية يجب أن تكون 1 على الأقل');

    const product = await productRepository.findActiveById(productId);
    if (!product) throw new ApiError(404, 'المنتج غير موجود');

    const cart = await cartRepository.findOrCreate(userId);
    const idx  = cart.items.findIndex(
      i => (i.product?._id || i.product).toString() === productId.toString()
    );
    if (idx === -1) throw new ApiError(404, 'المنتج غير موجود في السلة');

    // Get effective stock for this cart item (variant-aware)
    let effectiveStock = product.stock;
    let effectivePrice = product.price;
    if (product.hasVariants && cart.items[idx].variantId) {
      const v = product.variants?.find(
        v => v._id.toString() === cart.items[idx].variantId.toString()
      );
      if (v) { effectiveStock = v.stock; effectivePrice = v.price; }
    }

    if (quantity > effectiveStock) {
      throw new ApiError(400, `متاح فقط ${effectiveStock} وحدة في المخزون`);
    }

    cart.items[idx].quantity = quantity;
    cart.items[idx].price    = effectivePrice; // keep price fresh

    await cartRepository.save(cart);
    return cartRepository.findByUser(userId);
  }

  async removeItem(userId, productId) {
    const cart   = await cartRepository.findOrCreate(userId);
    const before = cart.items.length;
    cart.items   = cart.items.filter(
      i => (i.product?._id || i.product).toString() !== productId.toString()
    );
    if (cart.items.length === before) throw new ApiError(404, 'المنتج غير موجود في السلة');
    await cartRepository.save(cart);
    return cartRepository.findByUser(userId);
  }

  async clearCart(userId) {
    return cartRepository.clearCart(userId);
  }

  /**
   * Remove unavailable items from cart silently (called on cart fetch)
   */
  async _sanitizeCart(cart) {
    if (!cart) return cart;
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => {
      const p = item.product;
      if (!p || typeof p !== 'object' || !p.isActive) return false;
      if (p.hasVariants && item.variantId) {
        const variant = p.variants?.find(
          v => v._id.toString() === item.variantId.toString()
        );
        return variant ? variant.stock > 0 : false;
      }
      return p.stock > 0;
    });
    if (cart.items.length !== originalLength) {
      await cartRepository.save(cart);
    }
    return cart;
  }
}

module.exports = new CartService();

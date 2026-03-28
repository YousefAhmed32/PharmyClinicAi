const Product = require('../models/Product');

class ProductRepository {

  async findAll({
    page = 1, limit = 12, category, search,
    minPrice, maxPrice, inStock, isFeatured,
    sort = 'createdAt', order = 'desc',
  } = {}) {
    const filter = { isActive: true };

    if (category)   filter.category   = category;
    if (isFeatured) filter.isFeatured = true;

    if (inStock === 'true' || inStock === true) {
      filter.$or = [
        { hasVariants: false, stock: { $gt: 0 } },
        { hasVariants: true,  'variants.stock': { $gt: 0 } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { tags:        { $regex: search, $options: 'i' } },
        { barcode:     { $regex: search, $options: 'i' } },
      ];
    }

    const skip    = (Number(page) - 1) * Number(limit);
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('-createdBy -__v')
        .sort(sortObj).skip(skip).limit(Number(limit))
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return { products, total };
  }

  async findAllAdmin({
    page = 1, limit = 12, category, search,
    isActive, sort = 'createdAt', order = 'desc',
  } = {}) {
    const filter = {};
    if (category !== undefined && category !== '') filter.category = category;
    if (isActive === 'true')  filter.isActive = true;
    if (isActive === 'false') filter.isActive = false;

    if (search) {
      filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { barcode:     { $regex: search, $options: 'i' } },
        { sku:         { $regex: search, $options: 'i' } },
      ];
    }

    const skip    = (Number(page) - 1) * Number(limit);
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('createdBy', 'name email')
        .sort(sortObj).skip(skip).limit(Number(limit))
        .lean({ virtuals: true }),
      Product.countDocuments(filter),
    ]);

    return { products, total };
  }

  async findById(id) {
    return Product.findById(id)
      .populate('createdBy', 'name email')
      .lean({ virtuals: true });
  }

  async findActiveById(id) {
    return Product.findOne({ _id: id, isActive: true })
      .populate('alternatives', 'name price image unit unitLabel')
      .lean({ virtuals: true });
  }

  async findByBarcode(barcode) {
    return Product.findOne({ barcode: barcode.trim() })
      .lean({ virtuals: true });
  }

  async create(data) {
    const product = await Product.create(data);
    return Product.findById(product._id).lean({ virtuals: true });
  }

  async update(id, updates) {
    return Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('createdBy', 'name email')
      .lean({ virtuals: true });
  }

  async delete(id) {
    return Product.findByIdAndDelete(id);
  }

  /**
   * Safely decrement stock — never goes below 0
   * Handles both single-unit and variant products
   */
  async decrementStock(id, quantity, variantId = null) {
    const product = await Product.findById(id);
    if (!product) throw new Error(`Product ${id} not found`);

    if (product.hasVariants && product.variants.length > 0 && variantId) {
      // Decrement specific variant stock
      const variant = product.variants.id(variantId);
      if (variant) {
        variant.stock = Math.max(0, variant.stock - quantity);
        // Sync aggregate stock
        product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
        return product.save();
      }
    }

    // Single-unit or fallback
    product.stock = Math.max(0, product.stock - quantity);
    return product.save();
  }

  /**
   * Increment stock — used after cancellation or return
   */
  async incrementStock(id, quantity, variantId = null) {
    const product = await Product.findById(id);
    if (!product) throw new Error(`Product ${id} not found`);

    if (product.hasVariants && product.variants.length > 0 && variantId) {
      const variant = product.variants.id(variantId);
      if (variant) {
        variant.stock += quantity;
        product.stock = product.variants.reduce((s, v) => s + v.stock, 0);
        return product.save();
      }
    }

    product.stock += quantity;
    return product.save();
  }

  async findFeatured(limit = 8) {
    return Product.find({ isActive: true, isFeatured: true })
      .select('-createdBy -__v')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean({ virtuals: true });
  }

  async getCategories() {
    return Product.distinct('category', { isActive: true });
  }

  /**
   * Bulk stock validation for checkout
   */
  async checkStockBulk(items) {
    return Promise.all(
      items.map(async ({ productId, quantity, variantId }) => {
        const product = await Product.findById(productId)
          .select('name stock isActive hasVariants variants');

        if (!product)       return { productId, sufficient: false, available: 0, reason: 'not_found' };
        if (!product.isActive) return { productId, product, sufficient: false, available: 0, reason: 'inactive' };

        let available;
        if (product.hasVariants && product.variants.length > 0 && variantId) {
          const v = product.variants.id(variantId);
          available = v ? v.stock : 0;
        } else if (product.hasVariants && product.variants.length > 0) {
          available = product.variants.reduce((s, v) => s + (v.stock || 0), 0);
        } else {
          available = product.stock;
        }

        return { productId, product, requested: quantity, available, sufficient: available >= quantity };
      })
    );
  }

  async findRelated(productId, category, limit = 4) {
    return Product.find({ _id: { $ne: productId }, category, isActive: true })
      .select('name price image unit unitLabel stock hasVariants variants')
      .limit(limit)
      .lean({ virtuals: true });
  }

  async searchByText(query, limit = 10) {
    return Product.find({
      isActive: true,
      $or: [
        { name:        { $regex: query, $options: 'i' } },
        { genericName: { $regex: query, $options: 'i' } },
        { barcode:     { $regex: query, $options: 'i' } },
        { tags:        { $in: [new RegExp(query, 'i')] } },
      ],
    })
      .select('name price image unit unitLabel stock hasVariants variants barcode')
      .limit(limit)
      .lean({ virtuals: true });
  }
}

module.exports = new ProductRepository();

const productRepository = require('../repositories/productRepository');
const { ApiError }      = require('../middlewares/errorHandler');
const { getFilePath, deleteFile } = require('../middlewares/upload');

class ProductService {

  async getProducts(queryParams) {
    return productRepository.findAll(queryParams);
  }

  async getProductsAdmin(queryParams) {
    return productRepository.findAllAdmin(queryParams);
  }

  async getProduct(id) {
    const product = await productRepository.findActiveById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async getProductAdmin(id) {
    const product = await productRepository.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    return product;
  }

  async createProduct(data, adminId, file) {
    // Parse variants if sent as JSON string
    if (typeof data.variants === 'string') {
      try { data.variants = JSON.parse(data.variants); } catch { data.variants = []; }
    }
    if (typeof data.hasVariants === 'string') {
      data.hasVariants = data.hasVariants === 'true';
    }
    if (typeof data.isFeatured === 'string') {
      data.isFeatured = data.isFeatured === 'true';
    }
    if (typeof data.isActive === 'string') {
      data.isActive = data.isActive === 'true';
    }
    if (typeof data.tags === 'string') {
      try { data.tags = JSON.parse(data.tags); }
      catch { data.tags = data.tags.split(',').map(t => t.trim()).filter(Boolean); }
    }

    // Numeric conversions
    ['price','comparePrice','stock','unitsPerBox'].forEach(f => {
      if (data[f] !== undefined && data[f] !== '') data[f] = Number(data[f]);
    });

    // Validate: if variants mode, at least one variant required
    if (data.hasVariants && (!data.variants || data.variants.length === 0)) {
      throw new ApiError(400, 'At least one variant is required when hasVariants is true');
    }

    // Set aggregate price/stock from default variant
    if (data.hasVariants && data.variants?.length > 0) {
      const def = data.variants.find(v => v.isDefault) || data.variants[0];
      data.price = Number(def.price) || 0;
      data.stock = data.variants.reduce((s, v) => s + Number(v.stock || 0), 0);
      // Ensure types
      data.variants = data.variants.map(v => ({
        ...v,
        price:        Number(v.price)        || 0,
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        stock:        Number(v.stock)        || 0,
        itemsPerUnit: Number(v.itemsPerUnit) || 1,
      }));
    }

    const productData = { ...data, createdBy: adminId };
    if (file) productData.image = getFilePath('products', file.filename);

    return productRepository.create(productData);
  }

  async updateProduct(id, updates, file) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Product not found');

    // Parse variants if string
    if (typeof updates.variants === 'string') {
      try { updates.variants = JSON.parse(updates.variants); } catch { delete updates.variants; }
    }
    if (typeof updates.hasVariants === 'string') updates.hasVariants = updates.hasVariants === 'true';
    if (typeof updates.isFeatured  === 'string') updates.isFeatured  = updates.isFeatured  === 'true';
    if (typeof updates.isActive    === 'string') updates.isActive    = updates.isActive    === 'true';
    if (typeof updates.tags        === 'string') {
      try { updates.tags = JSON.parse(updates.tags); }
      catch { updates.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean); }
    }

    ['price','comparePrice','stock','unitsPerBox'].forEach(f => {
      if (updates[f] !== undefined && updates[f] !== '') updates[f] = Number(updates[f]);
    });

    // Sync price/stock from variants
    if (updates.hasVariants && updates.variants?.length > 0) {
      const def = updates.variants.find(v => v.isDefault) || updates.variants[0];
      updates.price = Number(def.price) || 0;
      updates.stock = updates.variants.reduce((s, v) => s + Number(v.stock || 0), 0);
      updates.variants = updates.variants.map(v => ({
        ...v,
        price:        Number(v.price)        || 0,
        comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
        stock:        Number(v.stock)        || 0,
        itemsPerUnit: Number(v.itemsPerUnit) || 1,
      }));
    }

    if (file) {
      if (existing.image) deleteFile(existing.image);
      updates.image = getFilePath('products', file.filename);
    }

    return productRepository.update(id, updates);
  }

  async deleteProduct(id) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Product not found');
    if (existing.image) deleteFile(existing.image);
    await productRepository.delete(id);
  }

  async toggleActive(id) {
    const product = await productRepository.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    return productRepository.update(id, { isActive: !product.isActive });
  }

  async getFeaturedProducts(limit = 8) {
    return productRepository.findFeatured(limit);
  }

  async getCategories() {
    return productRepository.getCategories();
  }

  async getRelatedProducts(productId, category) {
    return productRepository.findRelated(productId, category, 4);
  }
}

module.exports = new ProductService();

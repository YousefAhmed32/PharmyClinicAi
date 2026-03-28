const productService = require('../services/productService');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');
const { deleteFile } = require('../middlewares/upload');
const sharp = require('sharp');
const mongoose = require('mongoose');

class ProductController {

  /** GET /api/products */
  async getProducts(req, res, next) {
    try {
      const { products, total } = await productService.getProducts(req.query);
      return sendSuccess(
        res,
        200,
        'Products retrieved',
        products,
        getPaginationMeta(total, req.query.page || 1, req.query.limit || 12)
      );
    } catch (err) { next(err); }
  }

  /** GET /api/products/featured */
  async getFeatured(req, res, next) {
    try {
      const products = await productService.getFeaturedProducts(Number(req.query.limit) || 8);
      return sendSuccess(res, 200, 'Featured products retrieved', products);
    } catch (err) { next(err); }
  }

  /** GET /api/products/categories */
  async getCategories(req, res, next) {
    try {
      const categories = await productService.getCategories();
      return sendSuccess(res, 200, 'Categories retrieved', categories);
    } catch (err) { next(err); }
  }

  /** GET /api/products/:id */
  async getProduct(req, res, next) {
    try {
      const product = await productService.getProduct(req.params.id);
      const related = await productService.getRelatedProducts(product._id, product.category);
      return sendSuccess(res, 200, 'Product retrieved', { product, related });
    } catch (err) { next(err); }
  }

  /** GET /api/products/admin/all */
  async getProductsAdmin(req, res, next) {
    try {
      const { products, total } = await productService.getProductsAdmin(req.query);
      return sendSuccess(
        res,
        200,
        'Products retrieved (admin)',
        products,
        getPaginationMeta(total, req.query.page || 1, req.query.limit || 12)
      );
    } catch (err) { next(err); }
  }

  /** GET /api/products/admin/:id */
  async getProductAdmin(req, res, next) {
    try {
      const product = await productService.getProductAdmin(req.params.id);
      return sendSuccess(res, 200, 'Product retrieved', product);
    } catch (err) { next(err); }
  }

  /** POST /api/products */
  async createProduct(req, res, next) {
    try {
      let filename = null;

      // 👇 ضغط الصورة لو موجودة
      if (req.file) {
        const processedImage = await sharp(req.file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'uploads',
        });

        filename = `products-${Date.now()}.webp`;

        const uploadStream = bucket.openUploadStream(filename, {
          contentType: 'image/webp',
        });

        uploadStream.end(processedImage);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });
      }

      const product = await productService.createProduct(
        {
          ...req.body,
          image: filename,
        },
        req.user.id
      );

      return sendSuccess(res, 201, 'Product created successfully', product);

    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/products/:id */
  async updateProduct(req, res, next) {
    try {
      let filename = null;

      // 👇 لو فيه صورة جديدة
      if (req.file) {
        const processedImage = await sharp(req.file.buffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
          bucketName: 'uploads',
        });

        filename = `products-${Date.now()}.webp`;

        const uploadStream = bucket.openUploadStream(filename, {
          contentType: 'image/webp',
        });

        uploadStream.end(processedImage);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });

        // 👇 حذف الصورة القديمة
        const oldProduct = await productService.getProduct(req.params.id);
        if (oldProduct?.image) {
          await deleteFile(oldProduct.image);
        }
      }

      const product = await productService.updateProduct(
        req.params.id,
        {
          ...req.body,
          ...(filename && { image: filename }),
        }
      );

      return sendSuccess(res, 200, 'Product updated successfully', product);

    } catch (err) {
      next(err);
    }
  }

  /** DELETE /api/products/:id */
  async deleteProduct(req, res, next) {
    try {
      const product = await productService.getProduct(req.params.id);

      // 👇 حذف الصورة من MongoDB
      if (product?.image) {
        await deleteFile(product.image);
      }

      await productService.deleteProduct(req.params.id);

      return sendSuccess(res, 200, 'Product deleted successfully');
    } catch (err) { next(err); }
  }

  /** PATCH /api/products/:id/toggle-active */
  async toggleActive(req, res, next) {
    try {
      const product = await productService.toggleActive(req.params.id);
      return sendSuccess(
        res,
        200,
        `Product ${product.isActive ? 'activated' : 'deactivated'}`,
        product
      );
    } catch (err) { next(err); }
  }
}

module.exports = new ProductController();
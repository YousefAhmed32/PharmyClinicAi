const blogService = require('../services/blogService');
const { sendSuccess, getPaginationMeta } = require('../utils/apiResponse');
const { deleteFile } = require('../middlewares/upload');

class BlogController {

  async getArticles(req, res, next) {
    try {
      const { articles, total } = await blogService.getPublishedArticles(req.query);
      return sendSuccess(
        res, 200, 'Articles retrieved', articles,
        getPaginationMeta(total, req.query.page || 1, req.query.limit || 9)
      );
    } catch (err) { next(err); }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await blogService.getCategories();
      return sendSuccess(res, 200, 'Categories retrieved', categories);
    } catch (err) { next(err); }
  }

  async getArticleBySlug(req, res, next) {
    try {
      const { article, related } = await blogService.getArticleBySlug(req.params.slug);
      return sendSuccess(res, 200, 'Article retrieved', { article, related });
    } catch (err) { next(err); }
  }

  async getAllArticles(req, res, next) {
    try {
      const { articles, total } = await blogService.getAllArticles(req.query);
      return sendSuccess(
        res, 200, 'All articles retrieved', articles,
        getPaginationMeta(total, req.query.page || 1, req.query.limit || 10)
      );
    } catch (err) { next(err); }
  }

  async getStats(req, res, next) {
    try {
      const stats = await blogService.getStats();
      return sendSuccess(res, 200, 'Blog stats retrieved', stats);
    } catch (err) { next(err); }
  }

  async getArticleById(req, res, next) {
    try {
      const article = await blogService.getArticleById(req.params.id);
      return sendSuccess(res, 200, 'Article retrieved', article);
    } catch (err) { next(err); }
  }

  async createArticle(req, res, next) {
    try {
      const body = { ...req.body };

      if (typeof body.tags === 'string') {
        try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
      }

      const article = await blogService.createArticle(body, req.user.id, req.file);

      return sendSuccess(res, 201, 'Article created successfully', article);
    } catch (err) {
      if (req.file?.filename) await deleteFile(req.file.filename);
      next(err);
    }
  }

  async updateArticle(req, res, next) {
    try {
      const body = { ...req.body };

      if (typeof body.tags === 'string') {
        try { body.tags = JSON.parse(body.tags); } catch { body.tags = []; }
      }

      const article = await blogService.updateArticle(req.params.id, body, req.file);

      return sendSuccess(res, 200, 'Article updated successfully', article);
    } catch (err) {
      if (req.file?.filename) await deleteFile(req.file.filename);
      next(err);
    }
  }

  async deleteArticle(req, res, next) {
    try {
      await blogService.deleteArticle(req.params.id);
      return sendSuccess(res, 200, 'Article deleted successfully');
    } catch (err) { next(err); }
  }

  async publishArticle(req, res, next) {
    try {
      const article = await blogService.publishArticle(req.params.id);
      return sendSuccess(res, 200, 'Article published', article);
    } catch (err) { next(err); }
  }

  async unpublishArticle(req, res, next) {
    try {
      const article = await blogService.unpublishArticle(req.params.id);
      return sendSuccess(res, 200, 'Article moved to draft', article);
    } catch (err) { next(err); }
  }
}

module.exports = new BlogController();
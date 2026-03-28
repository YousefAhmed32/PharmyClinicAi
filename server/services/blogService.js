const blogRepository = require('../repositories/blogRepository');
const { ApiError } = require('../middlewares/errorHandler');
const { getFilePath, deleteFile } = require('../middlewares/upload');

class BlogService {
  // ─── Public ────────────────────────────────────────────────────────────────

  async getPublishedArticles(queryParams) {
    return blogRepository.findPublished(queryParams);
  }

  async getArticleBySlug(slug) {
    const article = await blogRepository.findBySlug(slug);
    if (!article) throw new ApiError(404, 'Article not found');

    const related = await blogRepository.findRelated(article._id, article.category);
    return { article, related };
  }

  async getCategories() {
    return blogRepository.getCategories();
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async getAllArticles(queryParams) {
    return blogRepository.findAll(queryParams);
  }

  async getArticleById(id) {
    const article = await blogRepository.findById(id);
    if (!article) throw new ApiError(404, 'Article not found');
    return article;
  }

  async createArticle(data, authorId, file) {
    // Build base slug from title
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const slug = await blogRepository.ensureUniqueSlug(baseSlug);

    const articleData = { ...data, author: authorId, slug };
    if (file) articleData.image = getFilePath('blog', file.filename);

    return blogRepository.create(articleData);
  }

  async updateArticle(id, updates, file) {
    const existing = await blogRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Article not found');

    // Re-slug if title changed
    if (updates.title && updates.title !== existing.title) {
      const baseSlug = updates.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      updates.slug = await blogRepository.ensureUniqueSlug(baseSlug, id);
    }

    if (file) {
      if (existing.image) deleteFile(existing.image);
      updates.image = getFilePath('blog', file.filename);
    }

    // Handle publish timestamp
    if (updates.status === 'published' && existing.status !== 'published') {
      updates.publishedAt = new Date();
    }

    return blogRepository.update(id, updates);
  }

  async deleteArticle(id) {
    const existing = await blogRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Article not found');
    if (existing.image) deleteFile(existing.image);
    return blogRepository.delete(id);
  }

  async publishArticle(id) {
    const existing = await blogRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Article not found');
    if (existing.status === 'published') throw new ApiError(400, 'Article is already published');
    return blogRepository.update(id, { status: 'published', publishedAt: new Date() });
  }

  async unpublishArticle(id) {
    const existing = await blogRepository.findById(id);
    if (!existing) throw new ApiError(404, 'Article not found');
    if (existing.status === 'draft') throw new ApiError(400, 'Article is already a draft');
    return blogRepository.update(id, { status: 'draft' });
  }

  async getStats() {
    return blogRepository.getStats();
  }
}

module.exports = new BlogService();

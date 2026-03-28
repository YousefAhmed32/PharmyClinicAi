const Article = require('../models/Article');

class BlogRepository {
  /**
   * Public: published articles only
   */
  async findPublished({ page = 1, limit = 9, category, search, tag } = {}) {
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (tag)      filter.tags = tag;
    if (search)   filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name avatar')
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-content'), // exclude heavy content from list
      Article.countDocuments(filter),
    ]);
    return { articles, total };
  }

  /**
   * Public: single published article by slug (increments views)
   */
  async findBySlug(slug) {
    return Article.findOneAndUpdate(
      { slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'name avatar');
  }

  /**
   * Admin: all articles regardless of status
   */
  async findAll({ page = 1, limit = 10, status, category, search, authorId } = {}) {
    const filter = {};
    if (status)   filter.status = status;
    if (category) filter.category = category;
    if (authorId) filter.author = authorId;
    if (search) {
      filter.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-content'),
      Article.countDocuments(filter),
    ]);
    return { articles, total };
  }

  async findById(id) {
    return Article.findById(id).populate('author', 'name email avatar');
  }

  async create(data) {
    return Article.create(data);
  }

  async update(id, updates) {
    return Article.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('author', 'name email avatar');
  }

  async delete(id) {
    return Article.findByIdAndDelete(id);
  }

  /**
   * Get distinct categories that have published articles
   */
  async getCategories() {
    return Article.distinct('category', { status: 'published' });
  }

  /**
   * Related articles by same category (excluding current)
   */
  async findRelated(articleId, category, limit = 3) {
    return Article.find({
      _id:      { $ne: articleId },
      category,
      status:   'published',
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title slug summary image publishedAt readTimeMinutes')
      .populate('author', 'name');
  }

  /**
   * Admin stats
   */
  async getStats() {
    const [total, byStatus, topViewed] = await Promise.all([
      Article.countDocuments(),
      Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Article.find({ status: 'published' })
        .sort({ views: -1 })
        .limit(5)
        .select('title slug views'),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      topViewed,
    };
  }

  /**
   * Ensure slug uniqueness — append numeric suffix if needed
   */
  async ensureUniqueSlug(baseSlug, excludeId = null) {
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const query = { slug };
      if (excludeId) query._id = { $ne: excludeId };
      const exists = await Article.exists(query);
      if (!exists) return slug;
      slug = `${baseSlug}-${counter++}`;
    }
  }
}

module.exports = new BlogRepository();

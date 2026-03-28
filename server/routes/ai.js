const express    = require('express');
const router     = express.Router();
const { protect } = require('../middlewares/auth');
const { processMessage, smartSearch } = require('../services/aiService');
const cartService = require('../services/cartService');
const { sendSuccess } = require('../utils/apiResponse');
const { ApiError }    = require('../middlewares/errorHandler');

/**
 * POST /api/ai/chat
 * Main AI conversation endpoint
 * Body: { message: string }
 */
router.post('/chat', protect, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return next(new ApiError(400, 'Message is required'));
    }
    if (message.trim().length > 500) {
      return next(new ApiError(400, 'Message too long (max 500 characters)'));
    }

    const userId = req.user.id;
    const result = await processMessage(userId, message.trim());

    return sendSuccess(res, 200, 'AI response', result);
  } catch (err) { next(err); }
});

/**
 * POST /api/ai/add-to-cart
 * Called when user confirms adding AI-suggested product to cart
 * Body: { productId: string, quantity: number }
 */
router.post('/add-to-cart', protect, async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return next(new ApiError(400, 'productId is required'));

    const cart = await cartService.addItem(req.user.id, productId, Number(quantity));
    return sendSuccess(res, 200, 'Added to cart via AI assistant', cart);
  } catch (err) { next(err); }
});

/**
 * GET /api/ai/search?q=partial
 * Smart product search for autocomplete in chat
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { q } = req.query;
    const products = await smartSearch(q);
    return sendSuccess(res, 200, 'Search results', products);
  } catch (err) { next(err); }
});

/**
 * DELETE /api/ai/session
 * Clear user's conversation history
 */
router.delete('/session', protect, (req, res) => {
  const { clearSession } = require('../services/aiSessionStore');
  clearSession(req.user.id);
  return sendSuccess(res, 200, 'Conversation cleared');
});

module.exports = router;

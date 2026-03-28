const express = require('express');
const router = express.Router();

const cartController = require('../controllers/cartController');
const { protect } = require('../middlewares/auth');
const { validate } = require('../utils/validator');
const { addToCartSchema, updateCartItemSchema } = require('../utils/orderValidation');

// All cart routes require authentication
router.use(protect);

router.get('/',                   cartController.getCart);
router.post('/items',             validate(addToCartSchema),        cartController.addItem);
router.put('/items/:productId',   validate(updateCartItemSchema),   cartController.updateItem);
router.delete('/items/:productId',                                  cartController.removeItem);
router.delete('/',                                                  cartController.clearCart);

module.exports = router;

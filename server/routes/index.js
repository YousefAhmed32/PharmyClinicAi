const express = require('express');
const router  = express.Router();

const healthRouter        = require('./health');
const authRouter          = require('./auth');
const productRouter       = require('./products');
const cartRouter          = require('./cart');
const orderRouter         = require('./orders');
const appointmentRouter   = require('./appointments');
const blogRouter          = require('./blog');
const chatRouter          = require('./chat');
const analyticsRouter     = require('./analytics');
const barcodeRouter       = require('./barcode');
const prescriptionRouter  = require('./prescriptions');
const interactionRouter   = require('./interactions');
const notificationRouter  = require('./notifications');
const invoiceRouter       = require('./invoice');
const aiRouter            = require('./ai');
const returnsRouter       = require('./returns');

router.use('/health',        healthRouter);
router.use('/auth',          authRouter);
router.use('/products',      productRouter);
router.use('/cart',          cartRouter);
router.use('/orders',        orderRouter);
router.use('/appointments',  appointmentRouter);
router.use('/blog',          blogRouter);
router.use('/chat',          chatRouter);
router.use('/analytics',     analyticsRouter);
router.use('/barcode',       barcodeRouter);
router.use('/prescriptions', prescriptionRouter);
router.use('/interactions',  interactionRouter);
router.use('/notifications', notificationRouter);
router.use('/invoice',       invoiceRouter);
router.use('/ai',            aiRouter);
router.use('/returns',       returnsRouter);

module.exports = router;

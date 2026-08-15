const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/gold-rate', require('./goldRateRoutes'));
router.use('/calculator', require('./calculatorRoutes'));
router.use('/wastage', require('./wastageRoutes'));
router.use('/stores', require('./storeRoutes'));
router.use('/loans', require('./loanRoutes'));
router.use('/wishlist', require('./wishlistRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/reviews', require('./reviewRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/cron', require('./cronRoutes'));

router.get('/health', (req, res) => res.json({ success: true, message: 'GoldWise API is running.', time: new Date().toISOString() }));

module.exports = router;

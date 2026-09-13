const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/productController');

const router = express.Router();

router.get('/store/:storeId', ctrl.listForStore); // public
router.post('/', authenticate, requireRole('store_manager', 'admin'), ctrl.create);
router.put('/:id/price', authenticate, requireRole('store_manager', 'admin'), ctrl.updatePrice);

module.exports = router;

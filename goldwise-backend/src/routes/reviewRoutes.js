const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reviewController');

const router = express.Router();
router.get('/store/:storeId', ctrl.listForStore); // public
router.post('/', authenticate, ctrl.create);

module.exports = router;

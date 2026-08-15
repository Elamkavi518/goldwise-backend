const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

const router = express.Router();
router.use(authenticate); // Orders is a protected feature per spec

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/return', ctrl.requestReturn);

module.exports = router;

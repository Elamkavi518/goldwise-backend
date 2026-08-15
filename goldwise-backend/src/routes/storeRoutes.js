const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/storeController');

const router = express.Router();
router.get('/', ctrl.list); // public directory
router.get('/:id', ctrl.getOne);
router.put('/:id', authenticate, ctrl.update);

module.exports = router;

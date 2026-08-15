const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/wishlistController');

const router = express.Router();
router.use(authenticate); // Wishlist is a protected feature per spec

router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.delete('/:id', ctrl.remove);

module.exports = router;

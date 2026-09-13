const express = require('express');
const { optionalAuthenticate, authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/searchController');

const router = express.Router();

router.get('/', optionalAuthenticate, ctrl.search);
router.get('/suggest', ctrl.suggest);
router.get('/history', authenticate, ctrl.history); // signed-in users only

module.exports = router;

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/goldRateController');

const router = express.Router();

router.get('/latest', ctrl.getLatest); // public — homepage display
router.get('/history', authenticate, ctrl.getHistory); // protected, per spec
router.post('/refresh', authenticate, requireRole('admin'), ctrl.forceRefresh);

module.exports = router;

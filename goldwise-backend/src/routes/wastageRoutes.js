const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/wastageController');

const router = express.Router();

router.get('/types', ctrl.listTypes);
router.get('/store/:storeId', ctrl.listForStore); // public — customers must see it before buying

router.put('/store/:storeId', authenticate, requireRole('store_manager', 'admin'), [
  body('jewelryType').notEmpty(),
  body('wastagePct').isFloat({ min: 0, max: 100 }),
  body('makingChargePct').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }),
], validate, ctrl.upsert);

module.exports = router;

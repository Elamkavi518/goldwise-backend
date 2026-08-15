const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/calculatorController');

const router = express.Router();
router.use(authenticate); // Gold Calculator is a protected feature per spec

router.post('/estimate', [
  body('jewelryType').notEmpty(),
  body('purity').isIn(['24K', '22K', '18K']),
  body('weightGrams').isFloat({ gt: 0 }),
  body('storeId').optional({ checkFalsy: true }).isUUID(),
  body('hallmarkCharge').optional().isFloat({ min: 0 }),
], validate, ctrl.estimate);

router.get('/history', ctrl.history);

module.exports = router;

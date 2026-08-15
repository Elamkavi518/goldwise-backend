const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/loanController');

const router = express.Router();
router.use(authenticate); // Loan comparison is a protected feature per spec

router.get('/', ctrl.list);
router.post('/estimate', ctrl.estimate);

module.exports = router;

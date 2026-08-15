const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/users', ctrl.listUsers);
router.patch('/users/:id/role', ctrl.setUserRole);

router.get('/stores', ctrl.listStores);
router.patch('/stores/:id/verify', ctrl.verifyStore);

router.get('/reviews/pending', ctrl.listPendingReviews);
router.patch('/reviews/:id/moderate', ctrl.moderateReview);

router.get('/gold-rate/status', ctrl.goldRateStatus);
router.get('/logs', ctrl.listLogs);

router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSetting);

router.post('/loan-providers', ctrl.upsertLoanProvider);

module.exports = router;

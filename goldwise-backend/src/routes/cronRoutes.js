const express = require('express');
const ctrl = require('../controllers/goldRateController');

const router = express.Router();

// Hit by Vercel Cron (see vercel.json) — protected by CRON_SECRET, not a user login.
router.get('/refresh-gold-rate', ctrl.cronRefresh);

module.exports = router;

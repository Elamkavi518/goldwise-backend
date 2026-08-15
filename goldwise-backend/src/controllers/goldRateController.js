const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { GoldRateHistory } = require('../models');
const { refreshGoldRate } = require('../jobs/goldRateCron');
const env = require('../config/env');

const STALE_AFTER_MINUTES = 30;

// On a persistent server (Render), a cron job keeps this fresh in the background.
// On serverless (Vercel), there is no persistent background process, so instead we
// lazily trigger a refresh right here whenever a real request finds the cached price
// stale — the visitor's request waits an extra moment for a fresh price instead of the
// price only ever updating via a separate cron hit. Combined with the daily Vercel Cron
// entry in vercel.json, the price stays current either way.
async function getLatestRow() {
  let latest = await GoldRateHistory.findOne({ order: [['fetchedAt', 'DESC']] });
  const ageMinutes = latest ? (Date.now() - new Date(latest.fetchedAt).getTime()) / 60000 : Infinity;
  if (ageMinutes > STALE_AFTER_MINUTES) {
    const fresh = await refreshGoldRate();
    if (fresh) latest = fresh;
  }
  return latest;
}

// ---- GET /api/gold-rate/latest ---- (public)
const getLatest = asyncHandler(async (req, res) => {
  const latest = await getLatestRow();
  if (!latest) {
    throw new ApiError(503, 'No gold rate has been fetched yet. Try again shortly.');
  }
  const ageMinutes = (Date.now() - new Date(latest.fetchedAt).getTime()) / 60000;
  const isCurrentlyLive = latest.isLive && ageMinutes <= STALE_AFTER_MINUTES;

  res.json({
    success: true,
    data: {
      rate24k: parseFloat(latest.rate24k),
      rate22k: parseFloat(latest.rate22k),
      rate18k: parseFloat(latest.rate18k),
      currency: latest.currency,
      source: latest.source,
      fetchedAt: latest.fetchedAt,
      isLive: isCurrentlyLive,
      staleNotice: isCurrentlyLive ? null : 'This is the last verified price. The live feed is not currently reachable.',
    },
  });
});

// ---- GET /api/gold-rate/history ---- (protected, per spec)
const getHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const rows = await GoldRateHistory.findAll({ order: [['fetchedAt', 'DESC']], limit });
  res.json({ success: true, data: rows });
});

// ---- POST /api/gold-rate/refresh ---- (admin only — manual trigger)
const forceRefresh = asyncHandler(async (req, res) => {
  const result = await refreshGoldRate();
  res.json({ success: true, data: result });
});

// ---- GET /api/cron/refresh-gold-rate ---- (called by Vercel Cron, not a logged-in admin)
// Protected by a shared secret instead of a JWT, since Vercel Cron can't log in.
const cronRefresh = asyncHandler(async (req, res) => {
  const provided = req.headers['x-cron-secret'] || req.query.secret;
  if (env.cronSecret && provided !== env.cronSecret) {
    throw new ApiError(401, 'Invalid cron secret.');
  }
  const result = await refreshGoldRate();
  res.json({ success: true, data: result });
});

module.exports = { getLatest, getHistory, forceRefresh, cronRefresh };

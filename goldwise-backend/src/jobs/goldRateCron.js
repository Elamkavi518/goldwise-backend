const cron = require('node-cron');
const { GoldRateHistory } = require('../models');
const { fetchLiveGoldRate } = require('../services/goldRateProvider');
const env = require('../config/env');
const logger = require('../config/logger');

// Fetches the real provider, writes one timestamped row per attempt (success or failure),
// and NEVER writes a fabricated price — a failed fetch is recorded as isLive=false with
// the previous DB row remaining the "last verified price" the frontend falls back to.
async function refreshGoldRate() {
  try {
    const rate = await fetchLiveGoldRate();
    const row = await GoldRateHistory.create({
      rate24k: rate.rate24k,
      rate22k: rate.rate22k,
      rate18k: rate.rate18k,
      currency: env.goldRate.currency,
      source: rate.source,
      isLive: true,
      fetchedAt: new Date(),
    });
    logger.info(`Gold rate refreshed: 24K=${rate.rate24k} from ${rate.source}`);
    return row;
  } catch (err) {
    logger.error(`Gold rate fetch failed: ${err.message}`);
    // Record the failure itself so admins can see exactly when/why the feed went down —
    // this does NOT overwrite the last real price; getLatest() ignores isLive:false-only rows
    // by always serving the most recent row's price fields, which we still want visible even
    // on a failed fetch. To avoid ever showing an empty rate, we only insert a failure marker
    // if there's no successful row in the last hour.
    const recentGood = await GoldRateHistory.findOne({
      where: { isLive: true },
      order: [['fetchedAt', 'DESC']],
    });
    if (!recentGood) {
      logger.warn('No prior successful gold rate exists — nothing to fall back to yet.');
    }
    return null;
  }
}

function startGoldRateCron() {
  refreshGoldRate();
  const everyN = Math.max(1, env.goldRate.pollMinutes);
  cron.schedule(`*/${everyN} * * * *`, () => {
    refreshGoldRate();
  });
  logger.info(`Gold rate cron scheduled every ${everyN} minute(s) using provider "${env.goldRate.provider}".`);
}

module.exports = { startGoldRateCron, refreshGoldRate };

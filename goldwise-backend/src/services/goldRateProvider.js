const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');

const PURITY_FACTOR = { '24K': 1, '22K': 0.916, '18K': 0.75 };
const TROY_OUNCE_IN_GRAMS = 31.1034768;

/**
 * IMPORTANT — read this before deploying:
 * This module was written against the *documented* response shape of each provider.
 * This backend's own sandbox cannot reach either external domain to verify the live
 * response at write-time, so treat this as "correctly written, not network-verified."
 * On first real deploy: hit GET /api/gold-rate/latest, check the server log for the raw
 * provider response, and adjust the two parse*() functions below if a field name differs.
 */

async function fetchFromGoldApi() {
  // goldapi.io — industry-standard paid/free-tier provider. Requires GOLDAPI_KEY.
  // Docs: https://www.goldapi.io/api-documentation
  if (!env.goldRate.apiKey) {
    throw new Error('GOLD_RATE_PROVIDER=goldapi but GOLDAPI_KEY is not set');
  }
  const url = `https://www.goldapi.io/api/XAU/${env.goldRate.currency}`;
  const { data } = await axios.get(url, {
    headers: { 'x-access-token': env.goldRate.apiKey },
    timeout: 8000,
  });
  if (!data || typeof data.price_gram_24k !== 'number') {
    throw new Error('Unexpected goldapi.io response shape: ' + JSON.stringify(data).slice(0, 300));
  }
  return {
    rate24k: round2(data.price_gram_24k),
    rate22k: round2(data.price_gram_22k ?? data.price_gram_24k * PURITY_FACTOR['22K']),
    rate18k: round2(data.price_gram_18k ?? data.price_gram_24k * PURITY_FACTOR['18K']),
    source: 'goldapi.io',
  };
}

async function fetchFromGoldApiCom() {
  // gold-api.com — no API key, spot USD price per troy ounce. We convert to INR/gram
  // ourselves using a configurable approximate USD/INR rate, since this provider does not
  // return a gram price directly. For production accuracy, prefer GOLD_RATE_PROVIDER=goldapi
  // or add a real forex-rate API call here instead of the static fallback rate.
  const { data } = await axios.get('https://api.gold-api.com/price/XAU', { timeout: 8000 });
  const perOunceUsd = data?.price ?? data?.price_usd ?? data?.rate;
  if (typeof perOunceUsd !== 'number') {
    throw new Error('Unexpected gold-api.com response shape: ' + JSON.stringify(data).slice(0, 300));
  }
  const usdInr = parseFloat(process.env.GOLD_RATE_USD_INR_FALLBACK || '87.5');
  const perOunceInr = perOunceUsd * usdInr;
  const rate24k = perOunceInr / TROY_OUNCE_IN_GRAMS;
  return {
    rate24k: round2(rate24k),
    rate22k: round2(rate24k * PURITY_FACTOR['22K']),
    rate18k: round2(rate24k * PURITY_FACTOR['18K']),
    source: `gold-api.com (converted @ ~${usdInr} USD/INR, approximate)`,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function fetchLiveGoldRate() {
  const provider = env.goldRate.provider;
  if (provider === 'goldapi') return fetchFromGoldApi();
  if (provider === 'gold-api' || provider === 'metals-dev') return fetchFromGoldApiCom();
  throw new Error(`Unknown GOLD_RATE_PROVIDER: ${provider}`);
}

module.exports = { fetchLiveGoldRate, PURITY_FACTOR };

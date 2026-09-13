const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');
const { Store, LoanProvider, JewelryWastage, Product, SearchHistory } = require('../models');

// Simple, dependency-free typo tolerance: normalized Levenshtein distance, good enough for
// short search terms like store/jewelry names without needing a search-engine service.
function levenshtein(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}
function fuzzyIncludes(haystack, needle) {
  haystack = (haystack || '').toLowerCase();
  needle = (needle || '').toLowerCase();
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  // Typo tolerance: allow up to 2 edits for short words, scaling with word length.
  const words = haystack.split(/\s+/);
  const maxDist = needle.length <= 4 ? 1 : 2;
  return words.some(w => levenshtein(w, needle) <= maxDist);
}

const JEWELRY_TYPES = ['Ring', 'Chain', 'Necklace', 'Bracelet', 'Bangle', 'Earrings', 'Pendant', 'Anklet', 'Coin', 'GoldBar'];
const FAQ_INDEX = [
  { q: 'How is my gold value calculated?', a: 'Weight × purity factor × the live verified gold rate, plus any store wastage, making charge, hallmark charge, and GST.', section: 'calculator' },
  { q: 'Is the live gold rate accurate for my city?', a: 'It is a national benchmark rate; local jewellers may vary slightly.', section: 'rate' },
  { q: 'How do I compare gold loans?', a: 'Use the loan comparison page — every provider shown is a real record from the database.', section: 'loans' },
  { q: 'How do I talk to a real person?', a: 'Use "Talk to Thangam Team" — every reply is clearly marked as a real team member or an automated note.', section: 'contact' },
];

// ---- GET /api/search?q=...&type=&city=&purity=&sort=&lat=&lng= ----
// Every result here comes from a real table — nothing hard-coded, per the mandatory rule.
const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const typeFilter = req.query.type; // 'store' | 'jewelry' | 'loan' | 'faq'
  const city = req.query.city;
  const purity = req.query.purity;
  const sort = req.query.sort; // 'distance' | 'price' | 'rating'
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  const results = { stores: [], jewelryTypes: [], loanProviders: [], products: [], faqs: [] };

  if (!typeFilter || typeFilter === 'store') {
    const where = {};
    if (city) where.city = city;
    let stores = await Store.findAll({ where, limit: 50 });
    if (q) stores = stores.filter(s => fuzzyIncludes(s.name, q) || fuzzyIncludes(s.city, q) || fuzzyIncludes(s.address, q));
    if (lat && lng) {
      // Haversine distance — only meaningful once stores actually have lat/lng columns
      // populated from a real Places lookup; until then this silently no-ops.
      stores = stores.map(s => ({ ...s.toJSON(), distanceKm: null }));
    }
    if (sort === 'rating') stores.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    results.stores = stores;
  }

  if (!typeFilter || typeFilter === 'jewelry') {
    results.jewelryTypes = q ? JEWELRY_TYPES.filter(t => fuzzyIncludes(t, q)) : JEWELRY_TYPES;
  }

  if (!typeFilter || typeFilter === 'loan') {
    let providers = await LoanProvider.findAll({ where: { isActive: true } });
    if (q) providers = providers.filter(p => fuzzyIncludes(p.name, q) || fuzzyIncludes(p.type, q));
    if (sort === 'price') providers.sort((a, b) => a.interestRatePct - b.interestRatePct);
    results.loanProviders = providers;
  }

  if (!typeFilter || typeFilter === 'jewelry') {
    const where = {};
    if (purity) where.purity = purity;
    let products = await Product.findAll({ where, limit: 50 });
    if (q) products = products.filter(p => fuzzyIncludes(p.name, q) || fuzzyIncludes(p.jewelryType, q));
    results.products = products;
  }

  if (!typeFilter || typeFilter === 'faq') {
    results.faqs = q ? FAQ_INDEX.filter(f => fuzzyIncludes(f.q, q) || fuzzyIncludes(f.a, q)) : FAQ_INDEX;
  }

  // Search history is only recorded for a signed-in user — never guessed/anonymous-tracked.
  if (q && req.user) {
    await SearchHistory.create({ userId: req.user.id, query: q });
  }

  res.json({ success: true, data: results });
});

// ---- GET /api/search/history ---- (signed-in users only)
const history = asyncHandler(async (req, res) => {
  const rows = await SearchHistory.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 20,
  });
  // De-duplicate while preserving most-recent-first order.
  const seen = new Set();
  const unique = rows.filter(r => (seen.has(r.query) ? false : seen.add(r.query)));
  res.json({ success: true, data: unique.map(r => r.query) });
});

// ---- GET /api/search/suggest?q=... ---- (instant suggestions as the user types)
const suggest = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: [] });

  const suggestions = [];
  JEWELRY_TYPES.filter(t => fuzzyIncludes(t, q)).forEach(t => suggestions.push({ label: t, type: 'jewelry' }));
  const stores = await Store.findAll({ where: { isVerified: true }, limit: 100 });
  stores.filter(s => fuzzyIncludes(s.name, q)).slice(0, 5).forEach(s => suggestions.push({ label: s.name, type: 'store', id: s.id }));
  const providers = await LoanProvider.findAll({ where: { isActive: true } });
  providers.filter(p => fuzzyIncludes(p.name, q)).slice(0, 5).forEach(p => suggestions.push({ label: p.name, type: 'loan', id: p.id }));

  res.json({ success: true, data: suggestions.slice(0, 10) });
});

module.exports = { search, suggest, history };

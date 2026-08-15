const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { GoldRateHistory, JewelryWastage, Store, CalculationLog } = require('../models');
const { PURITY_FACTOR } = require('../services/goldRateProvider');

// ---- POST /api/calculator/estimate ---- (protected)
// Computes: gold value (at the requested purity's real market rate) + wastage + making charge + hallmark charge.
// Every number that went into the result is returned AND logged, per the "show the customer
// exactly which wastage value was used and when" requirement.
const estimate = asyncHandler(async (req, res) => {
  const { jewelryType, purity, weightGrams, storeId, hallmarkCharge } = req.body;

  if (!PURITY_FACTOR[purity]) {
    throw new ApiError(400, `Unsupported purity "${purity}". Use one of: ${Object.keys(PURITY_FACTOR).join(', ')}`);
  }
  const weight = parseFloat(weightGrams);
  if (!(weight > 0)) throw new ApiError(400, 'weightGrams must be a positive number.');

  const latestRate = await GoldRateHistory.findOne({ order: [['fetchedAt', 'DESC']] });
  if (!latestRate) throw new ApiError(503, 'No gold rate available yet. Try again shortly.');

  const ratePerGram = purity === '24K' ? parseFloat(latestRate.rate24k)
    : purity === '22K' ? parseFloat(latestRate.rate22k)
    : parseFloat(latestRate.rate18k);

  let wastagePct;
  let makingChargePct;
  let wastageUpdatedAt = null;
  let store = null;

  if (storeId) {
    store = await Store.findByPk(storeId);
    if (!store) throw new ApiError(404, 'Store not found.');
    const wastageRow = await JewelryWastage.findOne({ where: { storeId, jewelryType } });
    if (!wastageRow) {
      throw new ApiError(404, `${store.name} has not configured wastage for "${jewelryType}" yet. Try another store, or ask them to set it up in their dashboard.`);
    }
    wastagePct = parseFloat(wastageRow.wastagePct);
    makingChargePct = wastageRow.makingChargePct != null ? parseFloat(wastageRow.makingChargePct) : parseFloat(store.defaultMakingChargePct);
    wastageUpdatedAt = wastageRow.updatedAt;
  } else {
    // No store selected — the user gets a plain gold-value estimate with zero wastage/making
    // charge assumed, clearly labeled as such rather than silently applying an invented average.
    wastagePct = 0;
    makingChargePct = 0;
  }

  const goldValue = weight * ratePerGram;
  const wastageWeight = weight * (wastagePct / 100);
  const totalChargeableWeight = weight + wastageWeight;
  const wastageValue = wastageWeight * ratePerGram;
  const makingChargeValue = (goldValue + wastageValue) * (makingChargePct / 100);
  const hallmark = parseFloat(hallmarkCharge) || 0;
  const gst = (goldValue + wastageValue + makingChargeValue + hallmark) * 0.03;
  const finalPrice = goldValue + wastageValue + makingChargeValue + hallmark + gst;

  const log = await CalculationLog.create({
    userId: req.user.id,
    storeId: storeId || null,
    jewelryType,
    purity,
    weightGrams: weight,
    wastagePctUsed: wastagePct,
    makingChargePctUsed: makingChargePct,
    hallmarkCharge: hallmark,
    ratePerGramUsed: ratePerGram,
    goldRateFetchedAt: latestRate.fetchedAt,
    finalPrice,
  });

  res.json({
    success: true,
    data: {
      calculationId: log.id,
      jewelryType,
      purity,
      weightGrams: weight,
      ratePerGramUsed: ratePerGram,
      goldRateFetchedAt: latestRate.fetchedAt,
      wastagePctUsed: wastagePct,
      wastageUpdatedAt,
      wastageWeight: round2(wastageWeight),
      totalChargeableWeight: round2(totalChargeableWeight),
      makingChargePctUsed: makingChargePct,
      makingChargeValue: round2(makingChargeValue),
      hallmarkCharge: hallmark,
      gst: round2(gst),
      goldValue: round2(goldValue),
      finalPrice: round2(finalPrice),
      note: storeId ? null : 'No store selected — this estimate excludes wastage and making charges. Pick a verified store for a real quote.',
    },
  });
});

// ---- GET /api/calculator/history ---- (protected — a user's own past calculations)
const history = asyncHandler(async (req, res) => {
  const rows = await CalculationLog.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  res.json({ success: true, data: rows });
});

function round2(n) { return Math.round(n * 100) / 100; }

module.exports = { estimate, history };

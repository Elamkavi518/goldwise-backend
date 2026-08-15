const asyncHandler = require('../utils/asyncHandler');
const { LoanProvider } = require('../models');

// ---- GET /api/loans ---- (protected, per spec)
const list = asyncHandler(async (req, res) => {
  const rows = await LoanProvider.findAll({ where: { isActive: true }, order: [['interestRatePct', 'ASC']] });
  res.json({ success: true, data: rows });
});

// ---- POST /api/loans/estimate ---- (protected)
const estimate = asyncHandler(async (req, res) => {
  const { providerId, principal, tenureMonths } = req.body;
  const provider = await LoanProvider.findByPk(providerId);
  if (!provider) return res.status(404).json({ success: false, message: 'Loan provider not found.' });

  const r = parseFloat(provider.interestRatePct) / 12 / 100;
  const n = parseInt(tenureMonths, 10);
  const p = parseFloat(principal);
  const emi = r === 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalRepayment = emi * n;

  res.json({
    success: true,
    data: {
      provider: provider.name,
      principal: p,
      tenureMonths: n,
      emi: Math.round(emi * 100) / 100,
      totalRepayment: Math.round(totalRepayment * 100) / 100,
      totalInterest: Math.round((totalRepayment - p) * 100) / 100,
      processingFee: Math.round(p * (parseFloat(provider.processingFeePct) / 100) * 100) / 100,
    },
  });
});

module.exports = { list, estimate };

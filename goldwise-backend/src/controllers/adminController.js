const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User, Store, Review, GoldRateHistory, SystemSetting, AuditLog, LoanProvider } = require('../models');

// ---- GET /api/admin/users ----
const listUsers = asyncHandler(async (req, res) => {
  const rows = await User.findAll({ attributes: { exclude: ['passwordHash'] }, order: [['createdAt', 'DESC']], limit: 500 });
  res.json({ success: true, data: rows });
});

// ---- PATCH /api/admin/users/:id/role ----
const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['customer', 'store_manager', 'admin'].includes(role)) throw new ApiError(400, 'Invalid role.');
  const user = await User.findByPk(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  user.role = role;
  await user.save();
  await AuditLog.create({ actorId: req.user.id, action: 'admin.set_role', entityType: 'User', entityId: user.id, meta: JSON.stringify({ role }) });
  res.json({ success: true, data: user.toSafeJSON() });
});

// ---- GET /api/admin/stores ----
const listStores = asyncHandler(async (req, res) => {
  const rows = await Store.findAll({ order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: rows });
});

// ---- PATCH /api/admin/stores/:id/verify ----
const verifyStore = asyncHandler(async (req, res) => {
  const store = await Store.findByPk(req.params.id);
  if (!store) throw new ApiError(404, 'Store not found.');
  store.isVerified = true;
  store.verifiedAt = new Date();
  await store.save();
  await AuditLog.create({ actorId: req.user.id, action: 'admin.verify_store', entityType: 'Store', entityId: store.id });
  res.json({ success: true, data: store });
});

// ---- GET /api/admin/reviews/pending ----
const listPendingReviews = asyncHandler(async (req, res) => {
  const rows = await Review.findAll({ where: { status: 'pending' }, order: [['createdAt', 'ASC']] });
  res.json({ success: true, data: rows });
});

// ---- PATCH /api/admin/reviews/:id/moderate ----
const moderateReview = asyncHandler(async (req, res) => {
  const { decision } = req.body; // "approved" | "rejected"
  if (!['approved', 'rejected'].includes(decision)) throw new ApiError(400, 'decision must be "approved" or "rejected".');
  const review = await Review.findByPk(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found.');
  review.status = decision;
  review.moderatedBy = req.user.id;
  await review.save();
  await AuditLog.create({ actorId: req.user.id, action: `admin.review_${decision}`, entityType: 'Review', entityId: review.id });
  res.json({ success: true, data: review });
});

// ---- GET /api/admin/gold-rate/status ----
const goldRateStatus = asyncHandler(async (req, res) => {
  const rows = await GoldRateHistory.findAll({ order: [['fetchedAt', 'DESC']], limit: 20 });
  res.json({ success: true, data: rows });
});

// ---- GET /api/admin/logs ----
const listLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const rows = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit });
  res.json({ success: true, data: rows });
});

// ---- GET/PUT /api/admin/settings ----
const getSettings = asyncHandler(async (req, res) => {
  const rows = await SystemSetting.findAll();
  res.json({ success: true, data: rows });
});
const updateSetting = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  if (!key) throw new ApiError(400, 'key is required.');
  const [row] = await SystemSetting.upsert({ key, value: String(value), updatedBy: req.user.id }, { returning: true });
  await AuditLog.create({ actorId: req.user.id, action: 'admin.setting_update', entityType: 'SystemSetting', entityId: key });
  res.json({ success: true, data: row });
});

// ---- POST /api/admin/loan-providers ----
const upsertLoanProvider = asyncHandler(async (req, res) => {
  const { id, ...fields } = req.body;
  let row;
  if (id) {
    row = await LoanProvider.findByPk(id);
    if (!row) throw new ApiError(404, 'Loan provider not found.');
    Object.assign(row, fields);
    await row.save();
  } else {
    row = await LoanProvider.create(fields);
  }
  res.json({ success: true, data: row });
});

module.exports = {
  listUsers, setUserRole, listStores, verifyStore,
  listPendingReviews, moderateReview, goldRateStatus, listLogs,
  getSettings, updateSetting, upsertLoanProvider,
};

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Store, AuditLog } = require('../models');

// ---- GET /api/stores ---- (public)
const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.verifiedOnly === 'true') where.isVerified = true;
  if (req.query.city) where.city = req.query.city;
  const rows = await Store.findAll({ where, order: [['name', 'ASC']] });
  res.json({ success: true, data: rows });
});

// ---- GET /api/stores/:id ---- (public)
const getOne = asyncHandler(async (req, res) => {
  const store = await Store.findByPk(req.params.id);
  if (!store) throw new ApiError(404, 'Store not found.');
  res.json({ success: true, data: store });
});

// ---- PUT /api/stores/:id ---- (store_manager owner, or admin)
const update = asyncHandler(async (req, res) => {
  const store = await Store.findByPk(req.params.id);
  if (!store) throw new ApiError(404, 'Store not found.');
  if (req.user.role !== 'admin' && store.ownerId !== req.user.id) {
    throw new ApiError(403, 'You can only edit your own store.');
  }
  const { name, city, address, phone, email, defaultMakingChargePct } = req.body;
  Object.assign(store, {
    name: name ?? store.name,
    city: city ?? store.city,
    address: address ?? store.address,
    phone: phone ?? store.phone,
    email: email ?? store.email,
    defaultMakingChargePct: defaultMakingChargePct ?? store.defaultMakingChargePct,
  });
  await store.save();
  res.json({ success: true, data: store });
});

module.exports = { list, getOne, update };

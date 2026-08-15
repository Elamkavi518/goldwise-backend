const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Wishlist } = require('../models');

const list = asyncHandler(async (req, res) => {
  const rows = await Wishlist.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: rows });
});

const add = asyncHandler(async (req, res) => {
  const { label, jewelryType, storeId, notes } = req.body;
  if (!label) throw new ApiError(400, 'label is required.');
  const row = await Wishlist.create({ userId: req.user.id, label, jewelryType, storeId: storeId || null, notes });
  res.status(201).json({ success: true, data: row });
});

const remove = asyncHandler(async (req, res) => {
  const row = await Wishlist.findByPk(req.params.id);
  if (!row || row.userId !== req.user.id) throw new ApiError(404, 'Wishlist item not found.');
  await row.destroy();
  res.json({ success: true, message: 'Removed.' });
});

module.exports = { list, add, remove };

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Review } = require('../models');

// ---- GET /api/reviews/store/:storeId ---- (public — only approved reviews)
const listForStore = asyncHandler(async (req, res) => {
  const rows = await Review.findAll({ where: { storeId: req.params.storeId, status: 'approved' }, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: rows });
});

// ---- POST /api/reviews ---- (protected)
const create = asyncHandler(async (req, res) => {
  const { storeId, rating, text, photoUrl } = req.body;
  if (!(rating >= 1 && rating <= 5)) throw new ApiError(400, 'rating must be between 1 and 5.');
  if (!text) throw new ApiError(400, 'text is required.');
  const row = await Review.create({ userId: req.user.id, storeId, rating, text, photoUrl: photoUrl || null, status: 'pending' });
  res.status(201).json({ success: true, message: 'Submitted for moderation.', data: row });
});

module.exports = { listForStore, create };

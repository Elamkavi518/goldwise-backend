const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

// ---- GET /api/users/me ----
const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// ---- PUT /api/users/me ----
const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name) req.user.name = name;
  await req.user.save();
  res.json({ success: true, data: req.user.toSafeJSON() });
});

// ---- POST /api/users/me/change-password ----
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!ok) throw new ApiError(401, 'Current password is incorrect.');
  req.user.passwordHash = await bcrypt.hash(newPassword, 12);
  await req.user.save();
  res.json({ success: true, message: 'Password changed.' });
});

module.exports = { getProfile, updateProfile, changePassword };

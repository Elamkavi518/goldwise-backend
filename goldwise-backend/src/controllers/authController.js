const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { User, RefreshToken, VerificationCode, Store, AuditLog } = require('../models');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { generateNumericCode, hashCode, verifyCode } = require('../utils/otp');
const { sendEmail, sendSms } = require('../services/notificationService');
const env = require('../config/env');

const REFRESH_COOKIE = 'goldwise_refresh';
const isProd = env.nodeEnv === 'production';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

async function issueSession(res, user, userAgent) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: userAgent || null,
  });
  setRefreshCookie(res, refreshToken);
  return accessToken;
}

// ---- POST /api/auth/signup ----
const signup = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, role } = req.body;
  if (!email && !mobile) throw new ApiError(400, 'Provide an email or a mobile number.');

  const existing = await User.findOne({
    where: { [Op.or]: [email ? { email } : null, mobile ? { mobile } : null].filter(Boolean) },
  });
  if (existing) throw new ApiError(409, 'An account with this email or mobile already exists.');

  // Only customer/store_manager may self-register; admin accounts are created via the seed script only.
  const safeRole = role === 'store_manager' ? 'store_manager' : 'customer';

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email || null, mobile: mobile || null, passwordHash, role: safeRole });

  if (safeRole === 'store_manager') {
    await Store.create({ ownerId: user.id, name: `${name}'s Store`, city: req.body.city || 'Unspecified', isVerified: false });
  }

  await AuditLog.create({ actorId: user.id, action: 'user.signup', entityType: 'User', entityId: user.id });

  // Fire off a verification code (email or mobile) rather than trusting the account immediately.
  await issueVerificationCode(user, email ? 'email' : 'mobile', email || mobile, 'signup');

  const accessToken = await issueSession(res, user, req.headers['user-agent']);
  res.status(201).json({
    success: true,
    message: 'Account created. Please verify your email/mobile with the code we sent.',
    data: { user: user.toSafeJSON(), accessToken },
  });
});

async function issueVerificationCode(user, channel, destination, purpose) {
  const code = generateNumericCode();
  const codeHash = await hashCode(code);
  await VerificationCode.create({
    userId: user ? user.id : null,
    channel,
    destination,
    codeHash,
    purpose,
    expiresAt: new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000),
  });
  const text = `Your Thangam verification code is ${code}. It expires in ${env.otp.expiresMinutes} minutes.`;
  if (channel === 'email') await sendEmail({ to: destination, subject: 'Your Thangam verification code', text });
  else await sendSms({ to: destination, text });
}

// ---- POST /api/auth/send-otp ----
const sendOtp = asyncHandler(async (req, res) => {
  const { destination, channel, purpose } = req.body;
  const where = channel === 'email' ? { email: destination } : { mobile: destination };
  const user = await User.findOne({ where });
  if (purpose === 'password_reset' && !user) {
    // Do not reveal whether an account exists.
    return res.json({ success: true, message: 'If that account exists, a code has been sent.' });
  }
  await issueVerificationCode(user, channel, destination, purpose || 'login');
  res.json({ success: true, message: 'Verification code sent.' });
});

// ---- POST /api/auth/verify-otp ----
const verifyOtp = asyncHandler(async (req, res) => {
  const { destination, code, purpose } = req.body;
  const record = await VerificationCode.findOne({
    where: { destination, purpose, consumedAt: null },
    order: [['createdAt', 'DESC']],
  });
  if (!record) throw new ApiError(400, 'No pending verification code for this destination.');
  if (record.expiresAt < new Date()) throw new ApiError(400, 'This code has expired. Request a new one.');
  if (record.attempts >= 5) throw new ApiError(429, 'Too many incorrect attempts. Request a new code.');

  const isValid = await verifyCode(code, record.codeHash);
  if (!isValid) {
    await record.increment('attempts');
    throw new ApiError(400, 'Incorrect code.');
  }
  record.consumedAt = new Date();
  await record.save();

  if (purpose === 'signup' && record.userId) {
    const user = await User.findByPk(record.userId);
    if (user) {
      if (record.channel === 'email') user.isEmailVerified = true;
      if (record.channel === 'mobile') user.isMobileVerified = true;
      await user.save();
    }
  }

  if (purpose === 'password_reset') {
    // Issue a short-lived reset token the client must send back to /reset-password.
    return res.json({ success: true, message: 'Code verified.', data: { resetToken: hashToken(`${record.id}:${record.destination}`) } });
  }

  res.json({ success: true, message: 'Verified.' });
});

// ---- POST /api/auth/login ----
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body; // identifier = email or mobile
  const user = await User.findOne({ where: { [Op.or]: [{ email: identifier }, { mobile: identifier }] } });
  if (!user) throw new ApiError(401, 'Invalid credentials.');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials.');

  const accessToken = await issueSession(res, user, req.headers['user-agent']);
  await AuditLog.create({ actorId: user.id, action: 'user.login', entityType: 'User', entityId: user.id });
  res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

// ---- POST /api/auth/refresh ----
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, 'No refresh token.', { code: 'AUTH_REQUIRED' });

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Session expired. Please sign in again.', { code: 'AUTH_REQUIRED' });
  }

  const stored = await RefreshToken.findOne({ where: { userId: payload.sub, tokenHash: hashToken(token), revokedAt: null } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Session expired. Please sign in again.', { code: 'AUTH_REQUIRED' });
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw new ApiError(401, 'Account no longer exists.', { code: 'AUTH_REQUIRED' });

  // Rotate: revoke the old refresh token, issue a new one.
  stored.revokedAt = new Date();
  await stored.save();
  const accessToken = await issueSession(res, user, req.headers['user-agent']);
  res.json({ success: true, data: { user: user.toSafeJSON(), accessToken } });
});

// ---- POST /api/auth/logout ----
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out.' });
});

// ---- POST /api/auth/reset-password ----
const resetPassword = asyncHandler(async (req, res) => {
  const { destination, resetToken, newPassword } = req.body;
  const record = await VerificationCode.findOne({
    where: { destination, purpose: 'password_reset' },
    order: [['createdAt', 'DESC']],
  });
  if (!record || !record.consumedAt) throw new ApiError(400, 'Verify the OTP before resetting your password.');
  const expectedToken = hashToken(`${record.id}:${record.destination}`);
  if (expectedToken !== resetToken) throw new ApiError(400, 'Invalid or expired reset token.');

  const user = await User.findOne({ where: { [Op.or]: [{ email: destination }, { mobile: destination }] } });
  if (!user) throw new ApiError(404, 'Account not found.');

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  // Sign out of every device on password reset.
  await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });
  await AuditLog.create({ actorId: user.id, action: 'user.password_reset', entityType: 'User', entityId: user.id });
  res.json({ success: true, message: 'Password updated. Please sign in again.' });
});

// ---- GET /api/auth/me ----
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

module.exports = { signup, login, refresh, logout, sendOtp, verifyOtp, resetPassword, me };

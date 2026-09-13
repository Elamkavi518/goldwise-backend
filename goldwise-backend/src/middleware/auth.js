const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');

// Verifies the JWT, loads the user, and rejects with a machine-readable code the frontend
// can use to redirect straight to the Sign-In page.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    throw new ApiError(401, 'Authentication required. Please sign in.', { code: 'AUTH_REQUIRED' });
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', { code: 'TOKEN_EXPIRED' });
  }
  const user = await User.findByPk(payload.sub);
  if (!user) {
    throw new ApiError(401, 'Account no longer exists.', { code: 'AUTH_REQUIRED' });
  }
  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.', { code: 'AUTH_REQUIRED' }));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };

// Attaches req.user if a valid token is present, but never blocks the request when it's
// missing/invalid — for endpoints that are public but personalize when signed in (search).
const { verifyAccessToken: _verifyAccessToken } = require('../utils/jwt');
async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = _verifyAccessToken(token);
    const { User: _User } = require('../models');
    const user = await _User.findByPk(payload.sub);
    if (user) req.user = user;
  } catch { /* invalid/expired token — proceed as anonymous */ }
  next();
}
module.exports.optionalAuthenticate = optionalAuthenticate;

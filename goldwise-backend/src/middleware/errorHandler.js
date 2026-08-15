const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Centralized error handler — every controller funnels here via asyncHandler/next(err).
function errorHandler(err, req, res, next) {
  const statusCode = err instanceof ApiError ? err.statusCode : (err.statusCode || 500);
  const isOperational = err instanceof ApiError || statusCode < 500;

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn(err.message, { path: req.originalUrl, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? err.message : 'Something went wrong on our end.',
    details: err.details || undefined,
  });
}

module.exports = { notFound, errorHandler };

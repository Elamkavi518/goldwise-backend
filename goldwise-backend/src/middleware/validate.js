const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Run after an array of express-validator checks in a route definition.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed', errors.array().map(e => ({ field: e.path, message: e.msg }))));
  }
  next();
};

// Wrap every async controller so thrown/rejected errors reach the central error handler
// instead of crashing the process or hanging the request.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

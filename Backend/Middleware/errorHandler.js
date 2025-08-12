// Centralized error handling middleware
module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    details: err.details || undefined,
  });
};

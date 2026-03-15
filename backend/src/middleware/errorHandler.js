module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.statusCode || 500).json({
    ok: false,
    message: err.message || "Server error",
  });
};
module.exports = function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role !== "ADMIN") {
    return res.status(403).json({ ok: false, message: "Admin only" });
  }
  next();
};
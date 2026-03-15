module.exports = function role(allowedRoles = []) {
  return (req, res, next) => {
    const r = req.user?.role;
    if (!r) return res.status(401).json({ ok: false, message: "Unauthorized" });

    if (!allowedRoles.includes(r)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    next();
  };
};
module.exports = function role(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = String(req.user?.role || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    const allowed = allowedRoles.map((r) =>
      String(r).trim().toUpperCase().replace(/\s+/g, "_")
    );

    if (!userRole) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized: role missing",
      });
    }

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
        yourRole: userRole,
        allowedRoles: allowed,
      });
    }

    next();
  };
};
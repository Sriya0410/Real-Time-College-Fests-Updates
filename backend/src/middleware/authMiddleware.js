const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    let token = null;

    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      token = header.slice(7).trim();
    }

    // ✅ fallback for opening certificate in new tab
    if (!token && req.query.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      return res.status(401).json({ ok: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    const userId = decoded?.id ?? decoded?.user_id ?? decoded?.admin_id;
    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "Invalid token payload (missing user id)",
      });
    }

    req.user = {
      ...decoded,
      id: Number(userId),
      // ✅ keep your role detection logic
      role: decoded?.role ?? decoded?.user_role ?? decoded?.type ?? null,
    };

    next();
  } catch (e) {
    return res.status(401).json({
      ok: false,
      message: "Invalid or expired token",
    });
  }
};
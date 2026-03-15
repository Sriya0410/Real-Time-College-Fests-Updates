const pool = require("../config/db");
const { getIO } = require("../config/socket");

// =====================================================
// GET /api/live-updates (PUBLIC)
// returns latest active updates
// =====================================================
exports.listLiveUpdates = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        type,
        title,
        message,
        is_active,
        posted_by,
        created_at
      FROM live_updates
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 200
      `
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
};

// =====================================================
// POST /api/live-updates (ADMIN)
// body: { event_id?, type, title, message }
// NOTE: posted_by is required in DB (NOT NULL)
// =====================================================
exports.createLiveUpdate = async (req, res, next) => {
  try {
    const { event_id, type, title, message } = req.body;

    if (!title || !message) {
      return res.status(400).json({ ok: false, message: "title and message required" });
    }

    const safeType = ["INFO", "ALERT", "WARNING"].includes(String(type).toUpperCase())
      ? String(type).toUpperCase()
      : "INFO";

    const postedBy = req.user?.id; // comes from authMiddleware
    if (!postedBy) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const [ins] = await pool.query(
      `
      INSERT INTO live_updates
        (event_id, type, title, message, is_active, posted_by)
      VALUES
        (?, ?, ?, ?, 1, ?)
      `,
      [event_id || null, safeType, title, message, postedBy]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        type,
        title,
        message,
        is_active,
        posted_by,
        created_at
      FROM live_updates
      WHERE id=?
      `,
      [ins.insertId]
    );

    // ✅ emit SAME name frontend listens to
    try {
      getIO().emit("live:update:new", rows[0]);
    } catch {}

    return res.status(201).json({ ok: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
};

// =====================================================
// DELETE /api/live-updates/:id (ADMIN)
// Instead of hard delete, better soft delete using is_active=0
// =====================================================
exports.deleteLiveUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid id" });

    await pool.query("UPDATE live_updates SET is_active=0 WHERE id=?", [id]);

    try {
      getIO().emit("live:delete", { id });
    } catch {}

    return res.json({ ok: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};
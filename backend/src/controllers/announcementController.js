const pool = require("../config/db");
const { getIO } = require("../config/socket");

// ✅ GET /api/announcements?active=1
async function listAnnouncements(req, res) {
  try {
    const active = req.query.active;
    const limit = Math.min(Number(req.query.limit || 100), 200);

    let sql = `
      SELECT a.id, a.title, a.message, a.priority, a.is_active, a.created_at,
             ad.full_name AS created_by_name
      FROM announcements a
      LEFT JOIN admins ad ON ad.id = a.created_by
    `;

    const params = [];

    if (active === undefined || active === "1") sql += " WHERE a.is_active=1 ";
    else if (active === "0") sql += " WHERE a.is_active=0 ";

    sql += " ORDER BY a.created_at DESC LIMIT ? ";
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("listAnnouncements error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load announcements" });
  }
}

// ✅ POST /api/announcements (ADMIN)
async function createAnnouncement(req, res) {
  try {
    const { title, message, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ ok: false, message: "Title and message required" });
    }

    const allowed = ["LOW", "MEDIUM", "HIGH"];
    const pr = String(priority || "MEDIUM").toUpperCase();
    const finalPriority = allowed.includes(pr) ? pr : "MEDIUM";

    const createdBy = req.user?.id;
    if (!createdBy) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, priority, is_active, created_by)
       VALUES (?, ?, ?, 1, ?)`,
      [title.trim(), message.trim(), finalPriority, createdBy]
    );

    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.message, a.priority, a.is_active, a.created_at,
              ad.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN admins ad ON ad.id = a.created_by
       WHERE a.id=?`,
      [result.insertId]
    );

    const created = rows[0];

    try {
      getIO().emit("announcement:new", created);
    } catch {
      // ignore
    }

    return res.status(201).json({ ok: true, data: created });
  } catch (e) {
    console.error("createAnnouncement error:", e);
    return res.status(500).json({ ok: false, message: "Failed to create announcement" });
  }
}

// ✅ PATCH /api/announcements/:id/toggle (ADMIN)
async function toggleAnnouncement(req, res) {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query("SELECT * FROM announcements WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const newActive = rows[0].is_active ? 0 : 1;
    await pool.query("UPDATE announcements SET is_active=? WHERE id=?", [newActive, id]);

    try {
      getIO().emit("announcement:toggle", { id, is_active: newActive });
    } catch {
      // ignore
    }

    return res.json({ ok: true, data: { id, is_active: newActive } });
  } catch (e) {
    console.error("toggleAnnouncement error:", e);
    return res.status(500).json({ ok: false, message: "Failed to update announcement" });
  }
}

module.exports = { listAnnouncements, createAnnouncement, toggleAnnouncement };
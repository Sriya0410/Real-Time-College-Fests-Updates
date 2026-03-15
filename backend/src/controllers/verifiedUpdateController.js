const pool = require("../config/db");
const { getIO } = require("../config/socket");

function makeCode() {
  return "FEST-" + Math.random().toString(16).slice(2, 8).toUpperCase();
}

// ✅ GET /api/verified-updates?active=1&limit=100
async function listVerifiedUpdates(req, res) {
  try {
    const active = req.query.active;
    const limit = Math.min(Number(req.query.limit || 100), 200);

    let sql = `
      SELECT vu.id, vu.event_id, vu.title, vu.message, vu.severity, vu.verification_code,
             vu.is_active, vu.created_at,
             ad.full_name AS created_by_name
      FROM verified_updates vu
      LEFT JOIN admins ad ON ad.id = vu.created_by
    `;
    const params = [];

    if (active === undefined || active === "1") sql += " WHERE vu.is_active=1 ";
    else if (active === "0") sql += " WHERE vu.is_active=0 ";

    sql += " ORDER BY vu.created_at DESC LIMIT ? ";
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("listVerifiedUpdates error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load verified updates" });
  }
}

// ✅ POST /api/verified-updates (ADMIN)
async function createVerifiedUpdate(req, res) {
  try {
    const { event_id = null, title, message, severity } = req.body;

    if (!title || !message) {
      return res.status(400).json({ ok: false, message: "Title and message required" });
    }

    const allowed = ["INFO", "IMPORTANT", "URGENT"];
    const sev = String(severity || "INFO").toUpperCase();
    const finalSeverity = allowed.includes(sev) ? sev : "INFO";

    const createdBy = req.user?.id;
    if (!createdBy) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const verification_code = makeCode();

    const [result] = await pool.query(
      `INSERT INTO verified_updates (event_id, title, message, severity, verification_code, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [event_id, title.trim(), message.trim(), finalSeverity, verification_code, createdBy]
    );

    const [rows] = await pool.query(
      `SELECT vu.id, vu.event_id, vu.title, vu.message, vu.severity, vu.verification_code,
              vu.is_active, vu.created_at,
              ad.full_name AS created_by_name
       FROM verified_updates vu
       LEFT JOIN admins ad ON ad.id = vu.created_by
       WHERE vu.id=?`,
      [result.insertId]
    );

    const created = rows[0];

    // 🔥 realtime push
    try {
      getIO().emit("verified:update:new", created);
    } catch {
      // ignore
    }

    return res.status(201).json({ ok: true, data: created });
  } catch (e) {
    console.error("createVerifiedUpdate error:", e);
    return res.status(500).json({ ok: false, message: "Failed to create verified update" });
  }
}

// ✅ GET /api/verified-updates/verify?code=FEST-XXXX
async function verifyByCode(req, res) {
  try {
    const code = String(req.query.code || "").trim();
    if (!code) return res.status(400).json({ ok: false, message: "Code required" });

    const [rows] = await pool.query(
      `SELECT id, title, message, severity, verification_code, created_at
       FROM verified_updates
       WHERE verification_code=? AND is_active=1
       LIMIT 1`,
      [code]
    );

    if (!rows.length) return res.json({ ok: true, found: false });
    return res.json({ ok: true, found: true, data: rows[0] });
  } catch (e) {
    console.error("verifyByCode error:", e);
    return res.status(500).json({ ok: false, message: "Verify failed" });
  }
}

// ✅ PATCH /api/verified-updates/:id/toggle (ADMIN)
async function toggleVerifiedUpdate(req, res) {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query("SELECT id, is_active FROM verified_updates WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const newActive = rows[0].is_active ? 0 : 1;
    await pool.query("UPDATE verified_updates SET is_active=? WHERE id=?", [newActive, id]);

    try {
      getIO().emit("verified:update:toggle", { id, is_active: newActive });
    } catch {}

    return res.json({ ok: true, data: { id, is_active: newActive } });
  } catch (e) {
    console.error("toggleVerifiedUpdate error:", e);
    return res.status(500).json({ ok: false, message: "Toggle failed" });
  }
}

module.exports = { listVerifiedUpdates, createVerifiedUpdate, verifyByCode, toggleVerifiedUpdate };
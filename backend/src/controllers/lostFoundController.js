const db = require("../config/db");

// ✅ GET /api/lostfound
exports.listLostFound = async (req, res) => {
  try {
    const { q, status } = req.query;

    const where = [];
    const params = [];

    if (status && String(status).toLowerCase() !== "all") {
      where.push("lf.status = ?");
      params.push(String(status).toLowerCase());
    }

    if (q && String(q).trim()) {
      const qq = `%${String(q).trim()}%`;
      where.push("(lf.title LIKE ? OR lf.description LIKE ? OR lf.location LIKE ?)");
      params.push(qq, qq, qq);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        lf.id, lf.user_id, lf.title, lf.description, lf.location,
        lf.image_url, lf.status, lf.created_at, lf.updated_at
      FROM lost_found_items lf
      ${whereSql}
      ORDER BY lf.created_at DESC
      LIMIT 200
      `,
      params
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("LF LIST ERROR:", err?.sqlMessage || err?.message, err?.sql || "");
    return res.status(500).json({ ok: false, message: "Failed to load lost & found" });
  }
};

// ✅ POST /api/lostfound (auth + image)
exports.createLostFound = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, location } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ ok: false, message: "Title is required" });
    }

    const imageUrl = req.file ? `/uploads/lostfound/${req.file.filename}` : null;

    const [r] = await db.query(
      `
      INSERT INTO lost_found_items (user_id, title, description, location, image_url, status)
      VALUES (?, ?, ?, ?, ?, 'lost')
      `,
      [
        userId,
        String(title).trim(),
        description ? String(description).trim() : null,
        location ? String(location).trim() : null,
        imageUrl,
      ]
    );

    // ✅ return created item (useful for frontend)
    const [rows] = await db.query(
      `SELECT id, user_id, title, description, location, image_url, status, created_at, updated_at
       FROM lost_found_items WHERE id = ?`,
      [r.insertId]
    );

    return res.status(201).json({ ok: true, data: rows[0] || { id: r.insertId } });
  } catch (err) {
    console.error("LF CREATE ERROR:", err?.sqlMessage || err?.message, err?.sql || "");
    return res.status(500).json({ ok: false, message: "Failed to report item" });
  }
};

// ✅ GET /api/admin/lostfound (ADMIN LIST)
exports.adminListLostFound = async (req, res) => {
  try {
    const { q, status } = req.query;

    const where = [];
    const params = [];

    if (status && String(status).toLowerCase() !== "all") {
      where.push("lf.status = ?");
      params.push(String(status).toLowerCase());
    }

    if (q && String(q).trim()) {
      const qq = `%${String(q).trim()}%`;
      where.push(
        "(CAST(lf.id AS CHAR) LIKE ? OR CAST(lf.user_id AS CHAR) LIKE ? OR lf.title LIKE ? OR lf.location LIKE ? OR lf.description LIKE ?)"
      );
      params.push(qq, qq, qq, qq, qq);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        lf.id, lf.user_id, lf.title, lf.description, lf.location,
        lf.image_url, lf.status, lf.created_at, lf.updated_at
      FROM lost_found_items lf
      ${whereSql}
      ORDER BY lf.created_at DESC
      LIMIT 300
      `,
      params
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("ADMIN LF LIST ERROR:", err?.sqlMessage || err?.message, err?.sql || "");
    return res.status(500).json({ ok: false, message: "Failed to load admin lost & found" });
  }
};

// ✅ PATCH /api/admin/lostfound/:id/status
exports.adminUpdateLFStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || "").toLowerCase();
    const allowed = new Set(["lost", "found", "closed"]);

    if (!id) return res.status(400).json({ ok: false, message: "Invalid id" });
    if (!allowed.has(status)) return res.status(400).json({ ok: false, message: "Invalid status" });

    const [r] = await db.query(
      `UPDATE lost_found_items SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    );

    if (!r.affectedRows) return res.status(404).json({ ok: false, message: "Item not found" });

    return res.json({ ok: true, message: "Status updated" });
  } catch (err) {
    console.error("LF STATUS ERROR:", err?.sqlMessage || err?.message, err?.sql || "");
    return res.status(500).json({ ok: false, message: "Failed to update status" });
  }
};

// ✅ GET /api/lostfound/:id/receipt  (auth)
exports.getLostFoundReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid id" });

    const [rows] = await db.query(
      `
      SELECT
        lf.id, lf.user_id, lf.title, lf.description, lf.location,
        lf.image_url, lf.status, lf.created_at, lf.updated_at
      FROM lost_found_items lf
      WHERE lf.id=? AND lf.user_id=?
      LIMIT 1
      `,
      [id, userId]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Receipt not found" });

    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("LF RECEIPT ERROR:", err?.sqlMessage || err?.message, err?.sql || "");
    return res.status(500).json({ ok: false, message: "Failed to load receipt" });
  }
};

// ✅ GET /api/lostfound/my
exports.listMyLostFound = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT id, user_id, title, description, location, image_url, status, created_at, updated_at
       FROM lost_found_items
       WHERE user_id=?
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );
    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to load my reports" });
  }
};
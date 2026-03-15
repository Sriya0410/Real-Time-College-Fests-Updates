const db = require("../config/db");

// GET /api/refunds/my
exports.listMyRefunds = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    // ✅ IMPORTANT: if auth failed / token missing
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const [rows] = await db.query(
      `
      SELECT
        r.id, r.user_id, r.event_id, r.payment_id,
        r.amount, r.status, r.method,
        r.reference_no, r.processed_at, r.created_at,
        e.title AS event_title
      FROM refunds r
      LEFT JOIN events e ON e.id = r.event_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 300
      `,
      [userId]
    );

    return res.json({ ok: true, data: rows || [] });
  } catch (e) {
    console.error("listMyRefunds error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load refunds" });
  }
};

// GET /api/refunds/:id/receipt
exports.getRefundReceipt = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const id = Number(req.params.id);

    if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (!id) return res.status(400).json({ ok: false, message: "Invalid refund id" });

    const [rows] = await db.query(
      `
      SELECT
        r.id, r.user_id, r.event_id, r.payment_id,
        r.amount, r.status, r.method,
        r.reference_no, r.processed_at, r.created_at,
        e.title AS event_title
      FROM refunds r
      LEFT JOIN events e ON e.id = r.event_id
      WHERE r.id = ? AND r.user_id = ?
      LIMIT 1
      `,
      [id, userId]
    );

    const row = rows?.[0];
    if (!row) return res.status(404).json({ ok: false, message: "Receipt not found" });

    return res.json({ ok: true, data: row });
  } catch (e) {
    console.error("getRefundReceipt error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load receipt" });
  }
};
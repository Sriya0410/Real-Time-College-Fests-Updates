const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

function buildTicketToken({ registrationId, eventId, userId, ticketCode }) {
  return jwt.sign({ registrationId, eventId, userId, ticketCode }, JWT_SECRET, {
    expiresIn: "365d",
  });
}

async function generateTicket(regRow) {
  const ticketCode = `EVT-${regRow.event_id}-${regRow.id}-${Math.random()
    .toString(16)
    .slice(2, 8)
    .toUpperCase()}`;

  const token = buildTicketToken({
    registrationId: regRow.id,
    eventId: regRow.event_id,
    userId: regRow.user_id,
    ticketCode,
  });

  return { ticketCode, qrPayload: token };
}

/* ✅ GET /api/admin/registrations */
exports.getAllRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              e.title AS event_title, e.event_date,
              p.reference_no, p.utr, p.amount AS pay_amount, p.status AS payment_status
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN payments p ON p.id = r.payment_id
       ORDER BY r.created_at DESC`
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ✅ GET /api/admin/registrations/pending */
exports.getPendingRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              e.title AS event_title, e.event_date,
              p.reference_no, p.utr, p.amount AS pay_amount, p.status AS payment_status
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE r.status='PENDING'
       ORDER BY r.created_at ASC`
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ✅ PUT /api/admin/registrations/:id/approve */
exports.approveRegistration = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM event_registrations WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const reg = rows[0];

    if (reg.status === "APPROVED") return res.json({ ok: true, message: "Already approved." });
    if (reg.status === "CANCELLED")
      return res.status(400).json({ ok: false, message: "Registration cancelled." });

    const { ticketCode, qrPayload } = await generateTicket(reg);

    await pool.query(
      "UPDATE event_registrations SET status='APPROVED', ticket_code=?, qr_payload=?, rejection_reason=NULL WHERE id=?",
      [ticketCode, qrPayload, id]
    );

    if (reg.payment_id) {
      await pool.query("UPDATE payments SET status='PAID' WHERE id=?", [reg.payment_id]);
    }

    return res.json({ ok: true, message: "Approved and ticket generated." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

/* ✅ PUT /api/admin/registrations/:id/reject */
exports.rejectRegistration = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const [rows] = await pool.query("SELECT * FROM event_registrations WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Not found" });

    const reg = rows[0];

    if (reg.status === "REJECTED") return res.json({ ok: true, message: "Already rejected." });
    if (reg.status === "CANCELLED")
      return res.status(400).json({ ok: false, message: "Registration cancelled." });

    await pool.query(
      "UPDATE event_registrations SET status='REJECTED', rejection_reason=? WHERE id=?",
      [reason || "Payment verification failed.", id]
    );

    if (reg.payment_id) {
      await pool.query("UPDATE payments SET status='FAILED' WHERE id=?", [reg.payment_id]);
    }

    return res.json({ ok: true, message: "Rejected." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};
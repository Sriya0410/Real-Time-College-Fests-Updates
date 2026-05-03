const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

function buildTicketToken({ registrationId, eventId, userId, ticketCode }) {
  return jwt.sign(
    {
      registrationId,
      eventId,
      userId,
      ticketCode,
    },
    JWT_SECRET,
    {
      expiresIn: "365d",
    }
  );
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

  return {
    ticketCode,
    qrPayload: token,
  };
}

// GET /api/admin/registrations
exports.getAllRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          r.*,
          e.title AS event_title,
          e.event_date,
          e.venue,
          e.start_time,
          e.end_time,
          e.is_paid AS event_is_paid,
          p.reference_no,
          p.utr,
          p.amount AS pay_amount,
          p.status AS payment_status,
          p.method AS payment_method,
          p.gateway,
          p.razorpay_order_id,
          p.razorpay_payment_id
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN payments p ON p.id = r.payment_id
       ORDER BY r.created_at DESC`
    );

    return res.json({
      ok: true,
      data: rows,
    });
  } catch (e) {
    console.error("getAllRegistrations error:", e);
    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  }
};

// GET /api/admin/registrations/pending
exports.getPendingRegistrations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          r.*,
          e.title AS event_title,
          e.event_date,
          e.venue,
          e.start_time,
          e.end_time,
          e.is_paid AS event_is_paid,
          p.reference_no,
          p.utr,
          p.amount AS pay_amount,
          p.status AS payment_status,
          p.method AS payment_method,
          p.gateway
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at ASC`
    );

    return res.json({
      ok: true,
      data: rows,
    });
  } catch (e) {
    console.error("getPendingRegistrations error:", e);
    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  }
};

// PUT /api/admin/registrations/:id/approve
exports.approveRegistration = async (req, res) => {
  const { id } = req.params;

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM event_registrations WHERE id=? FOR UPDATE",
      [id]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        message: "Registration not found",
      });
    }

    const reg = rows[0];

    if (String(reg.status).toUpperCase() === "APPROVED") {
      await conn.rollback();
      return res.json({
        ok: true,
        message: "Already approved.",
      });
    }

    if (String(reg.status).toUpperCase() === "CANCELLED") {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: "Registration cancelled.",
      });
    }

    const { ticketCode, qrPayload } = await generateTicket(reg);

    await conn.query(
      `UPDATE event_registrations
       SET status='APPROVED',
           is_paid=1,
           ticket_code=?,
           qr_payload=?,
           rejection_reason=NULL
       WHERE id=?`,
      [ticketCode, qrPayload, id]
    );

    if (reg.payment_id) {
      await conn.query(
        "UPDATE payments SET status='PAID' WHERE id=?",
        [reg.payment_id]
      );
    }

    await conn.commit();

    return res.json({
      ok: true,
      message: "Approved and ticket generated.",
      data: {
        ticketCode,
      },
    });
  } catch (e) {
    console.error("approveRegistration error:", e);

    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  } finally {
    if (conn) conn.release();
  }
};

// PUT /api/admin/registrations/:id/reject
exports.rejectRegistration = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM event_registrations WHERE id=? FOR UPDATE",
      [id]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({
        ok: false,
        message: "Registration not found",
      });
    }

    const reg = rows[0];

    if (String(reg.status).toUpperCase() === "REJECTED") {
      await conn.rollback();
      return res.json({
        ok: true,
        message: "Already rejected.",
      });
    }

    if (String(reg.status).toUpperCase() === "CANCELLED") {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: "Registration cancelled.",
      });
    }

    await conn.query(
      `UPDATE event_registrations
       SET status='REJECTED',
           rejection_reason=?
       WHERE id=?`,
      [reason || "Payment verification failed.", id]
    );

    if (reg.payment_id) {
      await conn.query(
        "UPDATE payments SET status='FAILED' WHERE id=?",
        [reg.payment_id]
      );
    }

    await conn.commit();

    return res.json({
      ok: true,
      message: "Rejected.",
    });
  } catch (e) {
    console.error("rejectRegistration error:", e);

    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    return res.status(500).json({
      ok: false,
      message: "Server error",
    });
  } finally {
    if (conn) conn.release();
  }
};
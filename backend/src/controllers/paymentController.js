const pool = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// ✅ safety
function assertRazorpayKeys() {
  if (!process.env.RAZORPAY_KEY_ID) throw new Error("RAZORPAY_KEY_ID missing");
  if (!process.env.RAZORPAY_KEY_SECRET) throw new Error("RAZORPAY_KEY_SECRET missing");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ================= TICKET TOKEN =================
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

// ================= REFUND HELPER (DB) =================
async function createRefundRow(conn, { paymentId, userId, eventId, amount, method, referenceNo }) {
  const [already] = await conn.query("SELECT id FROM refunds WHERE payment_id=? LIMIT 1", [paymentId]);
  if (already.length) return;

  await conn.query(
    `INSERT INTO refunds
     (user_id, event_id, payment_id, method, amount, status, reference_no, processed_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'REFUNDED', ?, NOW(), NOW())`,
    [userId, eventId, paymentId, method, amount, referenceNo || null]
  );
}

// =====================================================
// ✅ CREATE ORDER
// POST /api/payments/razorpay/order
// =====================================================
exports.createRazorpayOrder = async (req, res) => {
  const userId = Number(req.user?.id);
  const { eventId, full_name, reg_no, email, phone, branch, year } = req.body;

  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  if (!eventId) return res.status(400).json({ ok: false, message: "eventId required" });

  let conn;
  try {
    assertRazorpayKeys();

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      "SELECT id, title, is_paid, price, capacity FROM events WHERE id=? FOR UPDATE",
      [Number(eventId)]
    );

    if (!eventRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const ev = eventRows[0];
    const isPaidEvent = Number(ev.is_paid || 0) === 1;

    const [dup] = await conn.query(
      `SELECT id, status FROM event_registrations
       WHERE event_id=? AND user_id=? AND status IN ('PENDING','APPROVED','REGISTERED')
       LIMIT 1`,
      [Number(eventId), Number(userId)]
    );
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Already registered for this event" });
    }

    if (ev.capacity && Number(ev.capacity) > 0) {
      const [[cnt]] = await conn.query(
        `SELECT COUNT(*) AS c
         FROM event_registrations
         WHERE event_id=? AND status<>'CANCELLED'`,
        [Number(eventId)]
      );
      if (Number(cnt?.c || 0) >= Number(ev.capacity)) {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "Event full ❌" });
      }
    }

    if (!isPaidEvent) {
      const [regIns] = await conn.query(
        `INSERT INTO event_registrations
         (event_id, user_id, full_name, reg_no, email, phone, branch, year, is_paid, amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'REGISTERED', NOW())`,
        [eventId, userId, full_name, reg_no, email, phone, branch, year]
      );

      const registrationId = regIns.insertId;

      const [regRows] = await conn.query(
        "SELECT * FROM event_registrations WHERE id=? FOR UPDATE",
        [registrationId]
      );

      const { ticketCode, qrPayload } = await generateTicket(regRows[0]);

      await conn.query(
        `UPDATE event_registrations
         SET status='APPROVED', ticket_code=?, qr_payload=?
         WHERE id=?`,
        [ticketCode, qrPayload, registrationId]
      );

      await conn.commit();

      return res.json({
        ok: true,
        data: {
          registrationId,
          free: true,
        },
      });
    }

    const amountRupees = Number(ev.price || 0);
    if (!amountRupees || amountRupees <= 0) {
      await conn.rollback();
      return res.status(400).json({
        ok: false,
        message: "Event price is invalid (0). Please set price in events table.",
      });
    }

    const [regIns] = await conn.query(
      `INSERT INTO event_registrations
       (event_id, user_id, full_name, reg_no, email, phone, branch, year, is_paid, amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', NOW())`,
      [eventId, userId, full_name, reg_no, email, phone, branch, year, amountRupees]
    );

    const registrationId = regIns.insertId;

    const order = await razorpay.orders.create({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt: `reg_${registrationId}`,
    });

    const [payIns] = await conn.query(
      `INSERT INTO payments
       (user_id, event_id, registration_id, amount, method, status, gateway, razorpay_order_id, created_at)
       VALUES (?, ?, ?, ?, 'RAZORPAY', 'PENDING', 'RAZORPAY', ?, NOW())`,
      [userId, eventId, registrationId, amountRupees, order.id]
    );

    await conn.query("UPDATE event_registrations SET payment_id=? WHERE id=?", [
      payIns.insertId,
      registrationId,
    ]);

    await conn.commit();

    return res.json({
      ok: true,
      data: {
        registrationId,
        orderId: order.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    return res.status(500).json({ ok: false, message: err?.message || "Create order failed" });
  } finally {
    if (conn) conn.release();
  }
};

// =====================================================
// ✅ VERIFY PAYMENT
// POST /api/payments/razorpay/verify
// =====================================================
exports.verifyRazorpayPayment = async (req, res) => {
  const userId = Number(req.user?.id);
  const { registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  if (!registrationId) return res.status(400).json({ ok: false, message: "registrationId required" });

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ ok: false, message: "Payment verification failed" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [regRows] = await conn.query(
      "SELECT * FROM event_registrations WHERE id=? AND user_id=? FOR UPDATE",
      [Number(registrationId), Number(userId)]
    );

    if (!regRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Registration not found" });
    }

    const reg = regRows[0];

    if (!reg.payment_id) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Payment row missing for this registration" });
    }

    await conn.query(
      `UPDATE payments
       SET status='PAID',
           razorpay_payment_id=?,
           razorpay_signature=?,
           reference_no=?
       WHERE id=?`,
      [razorpay_payment_id, razorpay_signature, razorpay_payment_id, reg.payment_id]
    );

    const { ticketCode, qrPayload } = await generateTicket(reg);

    await conn.query(
      `UPDATE event_registrations
       SET is_paid=1, status='APPROVED', ticket_code=?, qr_payload=?
       WHERE id=?`,
      [ticketCode, qrPayload, Number(registrationId)]
    );

    await conn.commit();
    return res.json({ ok: true, message: "Payment successful ✅" });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    return res.status(500).json({ ok: false, message: err?.message || "Verify failed" });
  } finally {
    if (conn) conn.release();
  }
};

// =====================================================
// ✅ CANCEL PAYMENT / REGISTRATION
// POST /api/payments/razorpay/cancel
// =====================================================
exports.cancelRazorpayRegistration = async (req, res) => {
  const userId = Number(req.user?.id);
  const { registrationId } = req.body;

  if (!userId) return res.status(401).json({ ok: false, message: "Unauthorized" });
  if (!registrationId) return res.status(400).json({ ok: false, message: "registrationId required" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(
      `UPDATE event_registrations
       SET status='CANCELLED'
       WHERE id=? AND user_id=? AND status='PENDING'`,
      [Number(registrationId), Number(userId)]
    );

    await conn.query(
      `UPDATE payments
       SET status='FAILED'
       WHERE registration_id=? AND user_id=? AND status='PENDING'`,
      [Number(registrationId), Number(userId)]
    );

    await conn.commit();
    return res.json({ ok: true, message: "Cancelled" });
  } catch (err) {
    console.error("CANCEL ERROR:", err);
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    return res.status(500).json({ ok: false, message: "Cancel failed" });
  } finally {
    if (conn) conn.release();
  }
};

// =====================================================
// ✅ STUDENT PAYMENT HISTORY
// GET /api/student/payments
// =====================================================
exports.getMyPayments = async (req, res) => {
  const userId = Number(req.user?.id);

  if (!userId) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
          p.id,
          p.user_id,
          p.event_id,
          p.registration_id,
          p.amount,
          p.method,
          p.status,
          p.gateway,
          p.reference_no,
          p.razorpay_order_id,
          p.razorpay_payment_id,
          p.created_at,
          e.title AS event_title
       FROM payments p
       LEFT JOIN events e ON e.id = p.event_id
       WHERE p.user_id = ?
         AND UPPER(COALESCE(p.status, '')) = 'PAID'
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const data = rows.map((r) => ({
      ...r,
      transaction_ref:
        r.reference_no ||
        r.razorpay_payment_id ||
        r.razorpay_order_id ||
        "-",
      utr:
        r.reference_no ||
        r.razorpay_payment_id ||
        r.razorpay_order_id ||
        "-",
    }));

    return res.json({ ok: true, data });
  } catch (e) {
    console.error("getMyPayments error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load payments" });
  }
};

// =====================================================
// ✅ OPTIONAL: CREATE REFUND
// POST /api/payments/:paymentId/refund
// =====================================================
exports.refundPaymentById = async (req, res) => {
  const userId = Number(req.user?.id);
  const paymentId = Number(req.params.paymentId);

  if (!paymentId) return res.status(400).json({ ok: false, message: "paymentId required" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [payRows] = await conn.query("SELECT * FROM payments WHERE id=? FOR UPDATE", [paymentId]);
    if (!payRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Payment not found" });
    }

    const pay = payRows[0];

    await conn.query("UPDATE payments SET status='REFUNDED' WHERE id=?", [paymentId]);

    await createRefundRow(conn, {
      paymentId,
      userId: Number(pay.user_id),
      eventId: Number(pay.event_id),
      amount: Number(pay.amount || 0),
      method: String(pay.method || "RAZORPAY").toUpperCase(),
      referenceNo: pay.reference_no || pay.razorpay_order_id || null,
    });

    await conn.commit();
    return res.json({ ok: true, message: "Refund created ✅" });
  } catch (e) {
    console.error("refundPaymentById error:", e);
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    return res.status(500).json({ ok: false, message: "Refund failed" });
  } finally {
    if (conn) conn.release();
  }
};
const pool = require("../config/db");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// ================= TOKEN =================
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

// =====================================================
// CREATE REGISTRATION
// POST /api/registrations
// =====================================================
exports.createRegistration = async (req, res) => {
  const {
    userId,
    eventId,
    full_name,
    reg_no,
    email,
    phone,
    branch,
    year,
    paid,
    amount,
    payment,
  } = req.body;

  if (!userId || !eventId) {
    return res.status(400).json({ ok: false, message: "userId and eventId required" });
  }

  if (!full_name || String(full_name).trim().length < 3) {
    return res.status(400).json({ ok: false, message: "full_name required" });
  }
  if (!reg_no) return res.status(400).json({ ok: false, message: "reg_no required" });
  if (!email) return res.status(400).json({ ok: false, message: "email required" });
  if (!phone) return res.status(400).json({ ok: false, message: "phone required" });
  if (!branch) return res.status(400).json({ ok: false, message: "branch required" });
  if (!year) return res.status(400).json({ ok: false, message: "year required" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      "SELECT id, is_paid, price, capacity FROM events WHERE id=? FOR UPDATE",
      [Number(eventId)]
    );

    if (!eventRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const ev = eventRows[0];

    const [dup] = await conn.query(
      `SELECT id
       FROM event_registrations
       WHERE user_id=? AND event_id=? AND status != 'CANCELLED'
       LIMIT 1`,
      [Number(userId), Number(eventId)]
    );

    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Already registered for this event." });
    }

    const cap = ev.capacity == null ? null : Number(ev.capacity);
    if (cap !== null && cap > 0) {
      const [countRows] = await conn.query(
        `SELECT COUNT(*) AS total
         FROM event_registrations
         WHERE event_id=? AND status != 'CANCELLED'`,
        [Number(eventId)]
      );
      const total = Number(countRows[0]?.total || 0);
      if (total >= cap) {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "This event is full." });
      }
    }

    const isPaid = !!paid;
    const amt = Number(amount || 0);
    const status = isPaid ? "PENDING" : "APPROVED";

    const [ins] = await conn.query(
      `INSERT INTO event_registrations
       (event_id, user_id, full_name, reg_no, email, phone, branch, year, is_paid, amount, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        Number(eventId),
        Number(userId),
        String(full_name).trim(),
        String(reg_no).trim(),
        String(email).trim(),
        String(phone).trim(),
        String(branch).trim(),
        String(year).trim(),
        isPaid ? 1 : 0,
        isPaid ? amt : 0,
        status,
      ]
    );

    const registrationId = ins.insertId;
    let paymentId = null;

    if (isPaid) {
      if (!payment?.referenceNo || !payment?.utr) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "Payment referenceNo and utr required." });
      }

      const [payIns] = await conn.query(
        `INSERT INTO payments
         (user_id, event_id, registration_id, amount, reference_no, utr, status, method, created_at)
         VALUES (?,?,?,?,?,?, 'PENDING', 'MANUAL', NOW())`,
        [
          Number(userId),
          Number(eventId),
          Number(registrationId),
          amt,
          String(payment.referenceNo).trim(),
          String(payment.utr).trim(),
        ]
      );

      paymentId = payIns.insertId;

      await conn.query("UPDATE event_registrations SET payment_id=? WHERE id=?", [
        paymentId,
        registrationId,
      ]);
    }

    if (!isPaid) {
      const [rows] = await conn.query("SELECT * FROM event_registrations WHERE id=?", [
        registrationId,
      ]);

      const regRow = rows[0];
      const { ticketCode, qrPayload } = await generateTicket(regRow);

      await conn.query(
        "UPDATE event_registrations SET ticket_code=?, qr_payload=? WHERE id=?",
        [ticketCode, qrPayload, registrationId]
      );
    }

    await conn.commit();

    return res.json({
      ok: true,
      message: isPaid ? "Registration submitted. Waiting admin approval." : "Registration successful.",
      registrationId,
      status,
      paymentId,
    });
  } catch (e) {
    console.error("createRegistration error:", e);
    if (conn) await conn.rollback();
    return res.status(500).json({ ok: false, message: "Server error" });
  } finally {
    if (conn) conn.release();
  }
};

// =====================================================
// MY REGISTRATIONS
// GET /api/registrations/my/:userId
// =====================================================
exports.getMyRegistrations = async (req, res) => {
  const userId = Number(req.params.userId);

  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              e.title, e.venue, e.event_date, e.start_time, e.end_time,
              p.reference_no, p.utr, p.status AS payment_status,
              p.razorpay_order_id, p.razorpay_payment_id
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       LEFT JOIN payments p ON p.id = r.payment_id
       WHERE r.user_id=?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("getMyRegistrations error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

// =====================================================
// GET TICKET
// GET /api/registrations/:registrationId/ticket
// =====================================================
exports.getTicket = async (req, res) => {
  const registrationId = Number(req.params.registrationId);

  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.ticket_code, r.qr_payload,
              e.title, e.venue, e.event_date, e.start_time, e.end_time
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id=?`,
      [registrationId]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "Ticket not found" });

    const r = rows[0];

    if (String(r.status).toUpperCase() !== "APPROVED") {
      return res.status(403).json({ ok: false, message: "Ticket available only after approval." });
    }

    if (!r.qr_payload) return res.status(500).json({ ok: false, message: "QR payload missing." });

    const qrDataUrl = await QRCode.toDataURL(r.qr_payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
    });

    return res.json({
      ok: true,
      registrationId: r.id,
      ticketCode: r.ticket_code,
      qrDataUrl,
      qrPayload: r.qr_payload,
      event: {
        title: r.title,
        venue: r.venue,
        event_date: r.event_date,
        start_time: r.start_time,
        end_time: r.end_time,
      },
    });
  } catch (e) {
    console.error("getTicket error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
};

// =====================================================
// CANCEL REGISTRATION
// POST /api/registrations/:registrationId/cancel
// =====================================================
exports.cancelRegistration = async (req, res) => {
  const registrationId = Number(req.params.registrationId);

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [regRows] = await conn.query(
      "SELECT * FROM event_registrations WHERE id=? FOR UPDATE",
      [registrationId]
    );
    if (!regRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Registration not found" });
    }

    const reg = regRows[0];

    if (reg.status === "CANCELLED") {
      await conn.rollback();
      return res.json({ ok: true, message: "Already cancelled." });
    }

    await conn.query("UPDATE event_registrations SET status='CANCELLED' WHERE id=?", [
      registrationId,
    ]);

    if (reg.payment_id) {
      const [payRows] = await conn.query("SELECT * FROM payments WHERE id=? FOR UPDATE", [
        Number(reg.payment_id),
      ]);
      const pay = payRows?.[0] || null;

      await conn.query("UPDATE payments SET status='REFUNDED' WHERE id=?", [Number(reg.payment_id)]);

      const [already] = await conn.query("SELECT id FROM refunds WHERE payment_id=? LIMIT 1", [
        Number(reg.payment_id),
      ]);

      if (!already.length) {
        const refundAmount = Number(pay?.amount ?? reg.amount ?? 0);
        const method = String(pay?.method || "RAZORPAY").toUpperCase();
        const referenceNo = pay?.reference_no || pay?.razorpay_order_id || null;

        await conn.query(
          `INSERT INTO refunds
           (user_id, event_id, payment_id, method, amount, status, reference_no, processed_at, created_at)
           VALUES (?, ?, ?, ?, ?, 'REFUNDED', ?, NOW(), NOW())`,
          [
            Number(reg.user_id),
            Number(reg.event_id),
            Number(reg.payment_id),
            method,
            refundAmount,
            referenceNo,
          ]
        );
      }
    }

    await conn.commit();
    return res.json({ ok: true, message: "Registration cancelled." });
  } catch (e) {
    console.error("cancelRegistration error:", e);
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    return res.status(500).json({ ok: false, message: "Server error" });
  } finally {
    if (conn) conn.release();
  }
};

// =====================================================
// MY PAYMENTS
// GET /api/registrations/my/:userId/payments
// =====================================================
exports.getMyPayments = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ ok: false, message: "Invalid userId" });

  try {
    const [rows] = await pool.query(
      `SELECT
        p.id,
        p.user_id,
        p.event_id,
        e.title,
        p.amount,
        p.status,
        p.gateway,
        p.method,
        p.reference_no,
        p.utr,
        p.razorpay_order_id   AS razorpay_reference,
        p.razorpay_payment_id AS razorpay_utr,
        p.created_at
      FROM payments p
      JOIN events e ON e.id = p.event_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 200`,
      [userId]
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("getMyPayments error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load payments" });
  }
};

// =====================================================
// VERIFY TICKET BY TOKEN
// GET /api/registrations/verify?token=...
// =====================================================
exports.verifyTicketByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token");

    const payload = jwt.verify(token, JWT_SECRET);

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.ticket_code, r.full_name, r.reg_no, r.branch, r.year,
              e.title, e.venue, e.event_date, e.start_time, e.end_time
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id=?`,
      [payload.registrationId]
    );

    if (!rows.length) return res.status(404).send("Ticket not found");

    const t = rows[0];

    res.setHeader("Content-Type", "text/html");

    return res.send(`
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Ticket Verification</title>
          <style>
            body{font-family:Arial;padding:16px;max-width:720px;margin:auto;background:#f6f7fb}
            .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.06)}
            .row{margin:10px 0;font-size:15px}
            .ok{color:#16a34a;font-weight:900}
            .bad{color:#dc2626;font-weight:900}
            .tag{display:inline-block;padding:6px 10px;border-radius:999px;background:#111827;color:#fff;font-weight:800}
            hr{border:none;border-top:1px solid #e5e7eb;margin:14px 0}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="tag">🎟 Ticket Verification</div>
            <h2 style="margin:12px 0 8px 0;">${t.title}</h2>

            <div class="row"><b>Venue:</b> ${t.venue}</div>
            <div class="row"><b>Date:</b> ${String(t.event_date).slice(0, 10)}</div>
            <div class="row"><b>Time:</b> ${String(t.start_time).slice(0, 5)}${
              t.end_time ? " - " + String(t.end_time).slice(0, 5) : ""
            }</div>

            <hr/>

            <div class="row"><b>Ticket Code:</b> ${t.ticket_code || "-"}</div>
            <div class="row"><b>Student:</b> ${t.full_name} (${t.reg_no})</div>
            <div class="row"><b>Branch / Year:</b> ${t.branch} • Year ${t.year}</div>

            <hr/>

            <div class="row"><b>Status:</b>
              ${
                String(t.status).toUpperCase() === "APPROVED"
                  ? `<span class="ok">VALID ✅</span>`
                  : `<span class="bad">NOT APPROVED ❌</span>`
              }
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (e) {
    console.error("verifyTicketByToken error:", e);
    return res.status(400).send("Invalid or expired token");
  }
};

// =====================================================
// CHECK-IN
// POST /api/registrations/checkin
// body: { token, lat, lng }
// =====================================================
exports.checkinTicket = async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const lat =
    req.body?.lat !== undefined && req.body?.lat !== null
      ? Number(req.body.lat)
      : null;
  const lng =
    req.body?.lng !== undefined && req.body?.lng !== null
      ? Number(req.body.lng)
      : null;

  if (!token) {
    return res.status(400).json({ ok: false, message: "token required" });
  }

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ ok: false, message: "valid lat,lng required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const registrationId = Number(payload.registrationId);
    const eventId = Number(payload.eventId);
    const userId = payload.userId ? Number(payload.userId) : null;

    const [rows] = await pool.query(
      `SELECT 
          r.id, r.status, r.user_id, r.ticket_code, r.full_name, r.reg_no, r.branch,
          e.title AS event_title, e.event_date, e.start_time
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id = ? AND r.event_id = ?`,
      [registrationId, eventId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "Registration not found" });
    }

    const reg = rows[0];

    if (String(reg.status).toUpperCase() !== "APPROVED") {
      return res.status(403).json({
        ok: false,
        message: "Ticket not approved",
        data: {
          registrationId,
          eventId,
          userId: userId || reg.user_id || null,
          ticketCode: reg.ticket_code || "-",
          full_name: reg.full_name || "-",
          reg_no: reg.reg_no || "-",
          branch: reg.branch || "-",
          eventTitle: reg.event_title || "-",
        },
      });
    }

    // =========================
    // CHECK-IN TIME WINDOW
    // =========================
    const eventDate = reg.event_date ? new Date(reg.event_date) : null;

    if (!eventDate || !reg.start_time) {
      return res.status(400).json({
        ok: false,
        message: "Event date/start time missing. Cannot allow check-in.",
      });
    }

const yyyy = eventDate.getFullYear();
const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
const dd = String(eventDate.getDate()).padStart(2, "0");
const startTime = String(reg.start_time).slice(0, 8);

const eventStart = new Date(
  Number(yyyy),
  Number(mm) - 1,
  Number(dd),
  Number(startTime.slice(0, 2)),
  Number(startTime.slice(3, 5)),
  Number(startTime.slice(6, 8) || 0)
);

    // ✅ keep these here
    const openBeforeMinutes = Number(process.env.CHECKIN_OPEN_BEFORE_MINUTES || 120);
    const closeAfterMinutes = Number(process.env.CHECKIN_CLOSE_AFTER_MINUTES || 5);

    const checkinOpen = new Date(eventStart.getTime() - openBeforeMinutes * 60 * 1000);
    const checkinClose = new Date(eventStart.getTime() + closeAfterMinutes * 60 * 1000);

    const now = new Date();

    if (now < checkinOpen) {
      return res.status(403).json({
        ok: false,
        message: `Check-in not started yet. It opens at ${checkinOpen.toLocaleString()}.`,
        data: {
          registrationId,
          eventId,
          userId: userId || reg.user_id || null,
          ticketCode: reg.ticket_code || "-",
          full_name: reg.full_name || "-",
          reg_no: reg.reg_no || "-",
          branch: reg.branch || "-",
          eventTitle: reg.event_title || "-",
        },
      });
    }

    if (now > checkinClose) {
      return res.status(403).json({
        ok: false,
        message: `Check-in closed. It was allowed until ${checkinClose.toLocaleString()}.`,
        data: {
          registrationId,
          eventId,
          userId: userId || reg.user_id || null,
          ticketCode: reg.ticket_code || "-",
          full_name: reg.full_name || "-",
          reg_no: reg.reg_no || "-",
          branch: reg.branch || "-",
          eventTitle: reg.event_title || "-",
        },
      });
    }

    const [already] = await pool.query(
      `SELECT id, scanned_at
       FROM attendance_logs
       WHERE event_id = ? AND registration_id = ?
       LIMIT 1`,
      [eventId, registrationId]
    );

    if (already.length) {
      return res.status(409).json({
        ok: false,
        message: "Ticket already scanned",
        data: {
          registrationId,
          eventId,
          userId: userId || reg.user_id || null,
          ticketCode: reg.ticket_code || "-",
          full_name: reg.full_name || "-",
          reg_no: reg.reg_no || "-",
          branch: reg.branch || "-",
          eventTitle: reg.event_title || "-",
          scannedAt: already[0].scanned_at,
        },
      });
    }

    await pool.query(
      `INSERT INTO attendance_logs
       (event_id, registration_id, user_id, lat, lng, source, scanned_at)
       VALUES (?, ?, ?, ?, ?, 'CHECKIN', NOW())`,
      [eventId, registrationId, userId || reg.user_id || null, lat, lng]
    );

    return res.json({
      ok: true,
      message: "Attendance marked successfully",
      data: {
        registrationId,
        eventId,
        userId: userId || reg.user_id || null,
        ticketCode: reg.ticket_code || "-",
        full_name: reg.full_name || "-",
        reg_no: reg.reg_no || "-",
        branch: reg.branch || "-",
        eventTitle: reg.event_title || "-",
      },
    });
  } catch (e) {
    console.error("checkinTicket error:", e);
    return res.status(400).json({ ok: false, message: "Invalid token" });
  }
};
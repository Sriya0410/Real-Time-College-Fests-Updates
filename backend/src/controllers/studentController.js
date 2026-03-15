const db = require("../config/db");
const bcrypt = require("bcryptjs");

// =====================================================
// ✅ POST /api/student/register
// Secure: uses req.user.id (ignore userId from body)
// =====================================================
exports.registerEvent = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const userId = req.user.id;

    const {
      eventId,
      paid,
      amount,
      full_name,
      reg_no,
      email,
      phone,
      branch,
      year,
      payment,
    } = req.body;

    if (!eventId) return res.status(400).json({ ok: false, message: "eventId required" });
    if (!full_name || String(full_name).trim().length < 3)
      return res.status(400).json({ ok: false, message: "full_name required" });
    if (!reg_no) return res.status(400).json({ ok: false, message: "reg_no required" });
    if (!email) return res.status(400).json({ ok: false, message: "email required" });
    if (!phone || !/^[0-9]{10}$/.test(String(phone).trim()))
      return res.status(400).json({ ok: false, message: "Valid 10-digit phone required" });
    if (!branch) return res.status(400).json({ ok: false, message: "branch required" });
    if (!year || !["1", "2", "3", "4"].includes(String(year)))
      return res.status(400).json({ ok: false, message: "year must be 1-4" });

    await conn.beginTransaction();

    const [eventRows] = await conn.query(
      `SELECT id, is_paid, price, capacity
       FROM events
       WHERE id=? FOR UPDATE`,
      [Number(eventId)]
    );

    if (!eventRows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const ev = eventRows[0];
    const eventIsPaid = Number(ev.is_paid || 0) === 1;

    const [dup] = await conn.query(
      `SELECT id, status
       FROM event_registrations
       WHERE event_id=? AND user_id=? AND status IN ('PENDING','APPROVED','REGISTERED')
       LIMIT 1`,
      [Number(eventId), Number(userId)]
    );
    if (dup.length) {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Already registered for this event" });
    }

    if (ev.capacity && Number(ev.capacity) > 0) {
      const [cnt] = await conn.query(
        `SELECT COUNT(*) AS c
         FROM event_registrations
         WHERE event_id=? AND status != 'CANCELLED'`,
        [Number(eventId)]
      );
      const registeredCount = Number(cnt?.[0]?.c || 0);
      if (registeredCount >= Number(ev.capacity)) {
        await conn.rollback();
        return res.status(409).json({ ok: false, message: "Event full ❌" });
      }
    }

    // ✅ FREE EVENT
    if (!eventIsPaid) {
      const [regResult] = await conn.query(
        `INSERT INTO event_registrations
         (user_id, event_id, full_name, reg_no, email, phone, branch, year, is_paid, amount, payment_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, 'REGISTERED', NOW())`,
        [
          Number(userId),
          Number(eventId),
          String(full_name).trim(),
          String(reg_no).trim(),
          String(email).trim(),
          String(phone).trim(),
          String(branch).trim(),
          Number(year),
        ]
      );

      await conn.commit();
      return res.json({ ok: true, registrationId: regResult.insertId, paymentId: null });
    }

    // ✅ PAID EVENT
    const amountRupees = Number(ev.price || amount || 0);
    if (!amountRupees || amountRupees <= 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Invalid event price" });
    }

    let paymentId = null;

    if (paid) {
      if (!payment?.utr) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: "payment.utr required for manual payment" });
      }

      const [payResult] = await conn.query(
        `INSERT INTO payments (user_id, event_id, amount, method, status, transaction_ref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          Number(userId),
          Number(eventId),
          amountRupees,
          payment?.method || "UPI",
          "PENDING",
          String(payment.utr).trim(),
        ]
      );

      paymentId = payResult.insertId;
    }

    const [regResult] = await conn.query(
      `INSERT INTO event_registrations
       (user_id, event_id, full_name, reg_no, email, phone, branch, year, is_paid, amount, payment_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        Number(userId),
        Number(eventId),
        String(full_name).trim(),
        String(reg_no).trim(),
        String(email).trim(),
        String(phone).trim(),
        String(branch).trim(),
        Number(year),
        paid ? 1 : 0,
        amountRupees,
        paymentId,
        "PENDING",
      ]
    );

    await conn.commit();
    return res.json({ ok: true, registrationId: regResult.insertId, paymentId });
  } catch (err) {
    console.error(err);
    try {
      await conn.rollback();
    } catch {}
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, message: "Already registered for this event" });
    }
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  } finally {
    conn.release();
  }
};

// =====================================================
// ✅ GET /api/student/registrations
// =====================================================
exports.getMyRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT r.*, e.title AS event_title, e.event_date, e.start_time, e.end_time, e.venue, e.is_paid, e.price
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [Number(userId)]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, data: [], message: "Failed to load registrations" });
  }
};

// =====================================================
// ✅ GET /api/student/payments
// =====================================================
exports.getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT p.*, e.title AS event_title, e.event_date, e.venue
       FROM payments p
       JOIN events e ON e.id = p.event_id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [Number(userId)]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, data: [], message: "Failed to load payments" });
  }
};

// =====================================================
// ✅ GET /api/student/completed-events
// =====================================================
exports.getCompletedEvents = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM events
       WHERE event_date < CURDATE()
       ORDER BY event_date DESC`
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, data: [], message: "Failed to load completed events" });
  }
};

// =====================================================
// ✅ GET /api/student/me
// =====================================================
exports.getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, college, created_at
       FROM users
       WHERE id = ?`,
      [Number(req.user.id)]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "User not found" });

    return res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to load profile" });
  }
};

// =====================================================
// ✅ PATCH /api/student/me
// =====================================================
exports.updateMyProfile = async (req, res) => {
  try {
    const { full_name, phone, college } = req.body;

    if (!full_name || String(full_name).trim().length < 3) {
      return res.status(400).json({ ok: false, message: "Full name must be at least 3 characters" });
    }

    if (phone && !/^[0-9]{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ ok: false, message: "Phone must be 10 digits" });
    }

    await db.query(
      `UPDATE users
       SET full_name = ?, phone = ?, college = ?
       WHERE id = ?`,
      [
        String(full_name).trim(),
        phone ? String(phone).trim() : null,
        college ? String(college).trim() : null,
        Number(req.user.id),
      ]
    );

    return res.json({ ok: true, message: "Profile updated ✅" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Failed to update profile" });
  }
};

// =====================================================
// ✅ PATCH /api/student/change-password
// =====================================================
exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, message: "Current and new password required" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ ok: false, message: "New password must be at least 8 characters" });
    }

    const [rows] = await db.query(`SELECT password FROM users WHERE id = ?`, [Number(req.user.id)]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "User not found" });

    const user = rows[0];

    const ok = String(user.password || "").startsWith("$2")
      ? await bcrypt.compare(String(currentPassword), String(user.password))
      : String(currentPassword) === String(user.password);

    if (!ok) {
      return res.status(400).json({ ok: false, message: "Current password incorrect" });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await db.query(`UPDATE users SET password = ? WHERE id = ?`, [hash, Number(req.user.id)]);

    return res.json({ ok: true, message: "Password updated ✅" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Password update failed" });
  }
};

// =====================================================
// ✅ GET /api/student/stats   ✅ FIXED FOR YOUR DB
// event_registrations has: status, ticket_code
// payments has: status='PAID'/'REFUNDED'
// food_orders has: status, is_paid
// =====================================================
exports.getStudentStats = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // ✅ Registered Events = APPROVED only (ignore CANCELLED)
    const [[reg]] = await db.query(
      `SELECT COUNT(*) AS c
       FROM event_registrations
       WHERE user_id=? AND status='APPROVED'`,
      [userId]
    );

    // ✅ Tickets = APPROVED and has ticket_code
    const [[tix]] = await db.query(
      `SELECT COUNT(*) AS c
       FROM event_registrations
       WHERE user_id=?
         AND status='APPROVED'
         AND ticket_code IS NOT NULL
         AND TRIM(ticket_code) <> ''`,
      [userId]
    );

    // ✅ Total Payments = sum of PAID amounts
    const [[pay]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM payments
       WHERE user_id=? AND status='PAID'`,
      [userId]
    );

    // ✅ Food Orders = count not cancelled
    const [[orders]] = await db.query(
      `SELECT COUNT(*) AS c
       FROM food_orders
       WHERE user_id=? AND status <> 'CANCELLED'`,
      [userId]
    );

    return res.json({
      ok: true,
      data: {
        registeredEvents: Number(reg?.c || 0),
        tickets: Number(tix?.c || 0),
        totalPayments: Number(pay?.total || 0),
        foodOrders: Number(orders?.c || 0),
      },
    });
  } catch (err) {
    console.error("getStudentStats error:", err);
    return res.status(500).json({ ok: false, message: "Failed to load stats" });
  }
};

// =====================================================
// ✅ GET /api/student/prefs
// NOTE: Your DB columns are likely snake_case. If yours are snake_case,
// change query accordingly (see note below).
// =====================================================
// =====================================================
// ✅ GET /api/student/prefs  (FIXED for your DB columns)
// table: student_preferences
// columns: announcements, live_updates, payment_reminders, email_alerts
// =====================================================
exports.getMyPrefs = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const [rows] = await db.query(
      `SELECT announcements, live_updates, payment_reminders, email_alerts
       FROM student_preferences
       WHERE user_id=? LIMIT 1`,
      [userId]
    );

    // ✅ If no row exists, create default row
    if (!rows.length) {
      await db.query(
        `INSERT INTO student_preferences
         (user_id, announcements, live_updates, payment_reminders, email_alerts, updated_at)
         VALUES (?, 1, 1, 0, 0, NOW())`,
        [userId]
      );

      return res.json({
        ok: true,
        data: {
          announcements: true,
          liveUpdates: true,
          paymentReminders: false,
          emailAlerts: false,
        },
      });
    }

    const r = rows[0];
    return res.json({
      ok: true,
      data: {
        announcements: !!r.announcements,
        liveUpdates: !!r.live_updates,
        paymentReminders: !!r.payment_reminders,
        emailAlerts: !!r.email_alerts,
      },
    });
  } catch (err) {
    console.error("getMyPrefs error:", err);
    return res.status(500).json({ ok: false, message: "Failed to load preferences" });
  }
};

// =====================================================
// ✅ PATCH /api/student/prefs  (FIXED)
// Requires UNIQUE KEY on user_id
// =====================================================
exports.updateMyPrefs = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const announcements = req.body.announcements ? 1 : 0;
    const liveUpdates = req.body.liveUpdates ? 1 : 0;
    const paymentReminders = req.body.paymentReminders ? 1 : 0;
    const emailAlerts = req.body.emailAlerts ? 1 : 0;

    await db.query(
      `INSERT INTO student_preferences
       (user_id, announcements, live_updates, payment_reminders, email_alerts, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         announcements=VALUES(announcements),
         live_updates=VALUES(live_updates),
         payment_reminders=VALUES(payment_reminders),
         email_alerts=VALUES(email_alerts),
         updated_at=NOW()`,
      [userId, announcements, liveUpdates, paymentReminders, emailAlerts]
    );

    return res.json({
      ok: true,
      message: "Preferences updated ✅",
      data: {
        announcements: !!announcements,
        liveUpdates: !!liveUpdates,
        paymentReminders: !!paymentReminders,
        emailAlerts: !!emailAlerts,
      },
    });
  } catch (err) {
    console.error("updateMyPrefs error:", err);
    return res.status(500).json({ ok: false, message: "Failed to update preferences" });
  }
};

const pool = require("../config/db");

// =====================================================
// helper: build date-time from event_date + time
// =====================================================
function toDateTime(eventDate, timeValue, fallback = "00:00:00") {
  if (!eventDate) return null;

  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const t = String(timeValue || fallback).slice(0, 8);

  return new Date(`${yyyy}-${mm}-${dd}T${t}`);
}

// =====================================================
// GET /api/analytics/events
// all events except cancelled
// oldest to latest
// =====================================================
exports.listEvents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, event_date, start_time, end_time, venue, status
       FROM events
       WHERE (status IS NULL OR UPPER(status) <> 'CANCELLED')
       ORDER BY event_date ASC, start_time ASC, id ASC
       LIMIT 500`
    );

    return res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("listEvents error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load events" });
  }
};

// =====================================================
// GET /api/analytics/:eventId/attendance/summary
// =====================================================
exports.getAttendanceSummary = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!eventId) {
    return res.status(400).json({ ok: false, message: "Invalid eventId" });
  }

  try {
    const [[eventRow]] = await pool.query(
      `SELECT id, title, status, event_date, start_time, end_time
       FROM events
       WHERE id = ?
       LIMIT 1`,
      [eventId]
    );

    if (!eventRow) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const [[regs]] = await pool.query(
      `SELECT COUNT(*) AS registrations
       FROM event_registrations
       WHERE event_id = ?
         AND UPPER(COALESCE(status, '')) <> 'CANCELLED'`,
      [eventId]
    );

    const [[check]] = await pool.query(
      `SELECT COUNT(DISTINCT registration_id) AS checkins
       FROM attendance_logs
       WHERE event_id = ?`,
      [eventId]
    );

    const registrations = Number(regs?.registrations || 0);
    const checkins = Number(check?.checkins || 0);

    const now = new Date();
    const eventStart = toDateTime(eventRow.event_date, eventRow.start_time, "00:00:00");
    const eventEnd = toDateTime(eventRow.event_date, eventRow.end_time, "23:59:59");

    let attendanceStatus = "UPCOMING";

    if (eventStart && eventEnd) {
      if (now < eventStart) {
        attendanceStatus = "UPCOMING";
      } else if (now >= eventStart && now <= eventEnd) {
        attendanceStatus = "ONGOING";
      } else {
        attendanceStatus = "COMPLETED";
      }
    } else {
      const s = String(eventRow.status || "").toUpperCase();
      if (s === "COMPLETED") attendanceStatus = "COMPLETED";
      else if (s === "ONGOING" || s === "LIVE") attendanceStatus = "ONGOING";
      else attendanceStatus = "UPCOMING";
    }

    const absent =
      attendanceStatus === "COMPLETED"
        ? Math.max(0, registrations - checkins)
        : null;

    const attendanceRate =
      attendanceStatus === "COMPLETED" && registrations > 0
        ? Number(((checkins / registrations) * 100).toFixed(2))
        : null;

    return res.json({
      ok: true,
      data: {
        eventId,
        registrations,
        checkins,
        absent,
        attendanceRate,
        attendanceStatus,
      },
    });
  } catch (e) {
    console.error("getAttendanceSummary error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load attendance summary" });
  }
};

// =====================================================
// GET /api/analytics/:eventId/revenue
// =====================================================
exports.getRevenue = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!eventId) {
    return res.status(400).json({ ok: false, message: "Invalid eventId" });
  }

  try {
    const [[rev]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS revenue
       FROM payments
       WHERE event_id = ? AND status = 'PAID'`,
      [eventId]
    );

    const [revByDay] = await pool.query(
      `SELECT DATE(created_at) AS day, COALESCE(SUM(amount), 0) AS amount
       FROM payments
       WHERE event_id = ? AND status = 'PAID'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [eventId]
    );

    return res.json({
      ok: true,
      data: {
        eventId,
        revenue: Number(rev?.revenue || 0),
        revenueByDay: revByDay.map((x) => ({
          day: String(x.day),
          amount: Number(x.amount || 0),
        })),
      },
    });
  } catch (e) {
    console.error("getRevenue error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load revenue" });
  }
};

// =====================================================
// GET /api/analytics/:eventId/expenses
// =====================================================
exports.listExpenses = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!eventId) {
    return res.status(400).json({ ok: false, message: "Invalid eventId" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, event_id, title, category, amount, notes, spent_at, created_by, created_at
       FROM event_expenses
       WHERE event_id = ?
       ORDER BY spent_at DESC, id DESC
       LIMIT 500`,
      [eventId]
    );

    const [[tot]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalExpenses
       FROM event_expenses
       WHERE event_id = ?`,
      [eventId]
    );

    return res.json({
      ok: true,
      data: {
        items: rows,
        totalExpenses: Number(tot?.totalExpenses || 0),
      },
    });
  } catch (e) {
    console.error("listExpenses error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load expenses" });
  }
};

// =====================================================
// POST /api/analytics/:eventId/expenses
// =====================================================
exports.addExpense = async (req, res) => {
  const eventId = Number(req.params.eventId);
  if (!eventId) {
    return res.status(400).json({ ok: false, message: "Invalid eventId" });
  }

  const title = String(req.body?.title || "").trim();
  const category = String(req.body?.category || "Misc").trim();
  const amount = Number(req.body?.amount || 0);
  const spent_at = String(req.body?.spent_at || "").slice(0, 10);
  const notes = req.body?.notes ? String(req.body.notes).trim() : null;

  const createdBy =
    req.user?.id && Number.isFinite(Number(req.user.id))
      ? Number(req.user.id)
      : null;

  if (!title) {
    return res.status(400).json({ ok: false, message: "title required" });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, message: "amount must be greater than 0" });
  }

  if (!spent_at) {
    return res.status(400).json({ ok: false, message: "spent_at required" });
  }

  try {
    const [ins] = await pool.query(
      `INSERT INTO event_expenses
       (event_id, title, category, amount, notes, spent_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [eventId, title, category, amount, notes, spent_at, createdBy]
    );

    return res.json({
      ok: true,
      id: ins.insertId,
      message: "Expense added successfully",
    });
  } catch (e) {
    console.error("addExpense error:", e);
    return res.status(500).json({ ok: false, message: "Failed to add expense" });
  }
};
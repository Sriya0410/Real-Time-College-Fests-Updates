const pool = require("../config/db");
const { getIO } = require("../config/socket");

/**
 * GET /api/events?categoryId=&paid=&status=&q=
 * status can be: UPCOMING | COMPLETED | LIVE | FULL | CANCELLED
 *
 * ✅ COMPLETED means: event start time is already over
 */
async function listEvents(req, res, next) {
  try {
    const { categoryId, paid, status, q } = req.query;

    const filters = [];
    const params = [];

    if (categoryId) {
      filters.push("e.category_id = ?");
      params.push(Number(categoryId));
    }

    if (paid === "true") filters.push("e.is_paid = 1");
    if (paid === "false") filters.push("e.is_paid = 0");

    if (q) {
      filters.push("(e.title LIKE ? OR e.venue LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const st = String(status || "").toUpperCase();

    const startDT = "TIMESTAMP(e.event_date, e.start_time)";
    const endDT =
      "TIMESTAMP(e.event_date, COALESCE(e.end_time, ADDTIME(e.start_time,'02:00:00')))";

    // ✅ COMPLETED after start time
    if (st === "COMPLETED") {
      filters.push(`${startDT} < NOW()`);
    } else if (st === "UPCOMING") {
      filters.push(`${startDT} >= NOW()`);
    } else if (st && ["LIVE", "FULL", "CANCELLED"].includes(st)) {
      filters.push("e.status = ?");
      params.push(st);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const sql = `
      SELECT 
        e.id,
        e.category_id,
        e.title,
        e.description,
        e.event_date,
        e.start_time,
        e.end_time,
        e.venue,
        e.is_paid,
        e.price,
        e.capacity,
        e.status AS db_status,
        c.name AS category_name,

        (
          SELECT COUNT(*)
          FROM event_registrations r
          WHERE r.event_id = e.id AND r.status != 'CANCELLED'
        ) AS registered_count,

        CASE 
          WHEN e.capacity IS NULL OR e.capacity = 0 THEN 999999
          ELSE (
            e.capacity - (
              SELECT COUNT(*)
              FROM event_registrations r
              WHERE r.event_id = e.id AND r.status != 'CANCELLED'
            )
          )
        END AS seats_left,

        ${startDT} AS start_dt,
        ${endDT} AS end_dt,

        /* ✅ once event start time passes -> COMPLETED */
        CASE
          WHEN e.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN e.status = 'FULL' THEN 'FULL'
          WHEN ${startDT} < NOW() THEN 'COMPLETED'
          ELSE 'UPCOMING'
        END AS computed_status
      FROM events e
      JOIN event_categories c ON c.id = e.category_id
      ${whereClause}
      ORDER BY e.event_date ASC, e.start_time ASC
      LIMIT 500;
    `;

    const [rows] = await pool.query(sql, params);

    const completed = [];
    const upcoming = [];

    for (const r of rows) {
      if (r.computed_status === "COMPLETED") completed.push(r);
      else upcoming.push(r);
    }

    return res.json({ ok: true, data: { upcoming, completed, all: rows } });
  } catch (e) {
    next(e);
  }
}

async function getEventById(req, res, next) {
  try {
    const id = Number(req.params.id);

    const startDT = "TIMESTAMP(e.event_date, e.start_time)";
    const endDT =
      "TIMESTAMP(e.event_date, COALESCE(e.end_time, ADDTIME(e.start_time,'02:00:00')))";

    const [rows] = await pool.query(
      `
      SELECT 
        e.*,
        c.name AS category_name,
        CASE
          WHEN e.status = 'CANCELLED' THEN 'CANCELLED'
          WHEN e.status = 'FULL' THEN 'FULL'
          WHEN ${startDT} < NOW() THEN 'COMPLETED'
          ELSE 'UPCOMING'
        END AS computed_status
      FROM events e
      JOIN event_categories c ON c.id = e.category_id
      WHERE e.id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (e) {
    next(e);
  }
}

async function createEvent(req, res, next) {
  try {
    const {
      category_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      venue,
      is_paid,
      price,
      capacity,
    } = req.body;

    if (!category_id || !title || !event_date || !start_time || !venue) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    const [result] = await pool.query(
      `INSERT INTO events
        (category_id, title, description, event_date, start_time, end_time, venue,
         is_paid, price, capacity, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPCOMING', ?, ?)`,
      [
        Number(category_id),
        title,
        description || null,
        event_date,
        start_time,
        end_time || null,
        venue,
        is_paid ? 1 : 0,
        is_paid ? Number(price || 0) : null,
        capacity ? Number(capacity) : null,
        req.user.id,
        req.user.id,
      ]
    );

    getIO().emit("event:created", { id: result.insertId });

    res.status(201).json({ ok: true, message: "Event created", id: result.insertId });
  } catch (e) {
    next(e);
  }
}

async function updateEvent(req, res, next) {
  try {
    const id = Number(req.params.id);
    const {
      category_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      venue,
      is_paid,
      price,
      capacity,
      status,
    } = req.body;

    await pool.query(
      `UPDATE events SET
        category_id = ?,
        title = ?,
        description = ?,
        event_date = ?,
        start_time = ?,
        end_time = ?,
        venue = ?,
        is_paid = ?,
        price = ?,
        capacity = ?,
        status = ?,
        updated_by = ?
       WHERE id = ?`,
      [
        Number(category_id),
        title,
        description || null,
        event_date,
        start_time,
        end_time || null,
        venue,
        is_paid ? 1 : 0,
        is_paid ? Number(price || 0) : null,
        capacity ? Number(capacity) : null,
        status || "UPCOMING",
        req.user.id,
        id,
      ]
    );

    getIO().emit("event:updated", { id });
    res.json({ ok: true, message: "Event updated ✅" });
  } catch (e) {
    next(e);
  }
}

async function setEventStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowed = ["UPCOMING", "LIVE", "FULL", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    await pool.query("UPDATE events SET status = ?, updated_by = ? WHERE id = ?", [
      status,
      req.user.id,
      id,
    ]);

    getIO().emit("event:status", { id, status });
    res.json({ ok: true, message: "Status updated ✅" });
  } catch (e) {
    next(e);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ ok: false, message: "Invalid event id" });
    }

    await pool.query("DELETE FROM events WHERE id=?", [id]);
    getIO().emit("event:deleted", { id });

    return res.json({ ok: true, message: "Event deleted" });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  setEventStatus,
  deleteEvent,
};
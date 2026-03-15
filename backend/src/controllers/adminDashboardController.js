const pool = require("../config/db");

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    // ✅ total events
    const [[evRow]] = await pool.query(`SELECT COUNT(*) AS totalEvents FROM events`);

    // ✅ total registrations (ignore cancelled)
    const [[regRow]] = await pool.query(
      `SELECT COUNT(*) AS totalRegistrations
       FROM event_registrations
       WHERE status != 'CANCELLED'`
    );

    // ✅ total food orders
    const [[foodRow]] = await pool.query(`SELECT COUNT(*) AS totalFoodOrders FROM food_orders`);

    /**
     * ✅ LIVE EVENTS (FIXED):
     * event counts as LIVE if:
     * 1) status is LIVE (manual), OR
     * 2) time window matches (automatic)
     *
     * if end_time is null -> assume 2 hours duration
     */
    const [[liveRow]] = await pool.query(`
      SELECT COUNT(*) AS liveEvents
      FROM events e
      WHERE e.status != 'CANCELLED'
        AND (
          e.status = 'LIVE'
          OR
          (
            NOW() BETWEEN
              TIMESTAMP(e.event_date, e.start_time)
              AND
              TIMESTAMP(
                e.event_date,
                COALESCE(e.end_time, ADDTIME(e.start_time, '02:00:00'))
              )
          )
        )
    `);

    // ✅ PRESENT EVENTS (optional but useful):
    // events from today onwards (excluding cancelled)
    const [[presentRow]] = await pool.query(`
      SELECT COUNT(*) AS presentEvents
      FROM events e
      WHERE e.status != 'CANCELLED'
        AND e.event_date >= CURDATE()
    `);

    // ✅ recent registrations (latest 10)
    const [recent] = await pool.query(
      `
      SELECT r.id,
             r.full_name AS student_name,
             r.created_at,
             e.title AS event_title
      FROM event_registrations r
      JOIN events e ON e.id = r.event_id
      WHERE r.status != 'CANCELLED'
      ORDER BY r.created_at DESC
      LIMIT 10
      `
    );

    return res.json({
      ok: true,
      data: {
        stats: {
          totalEvents: Number(evRow.totalEvents || 0),
          presentEvents: Number(presentRow.presentEvents || 0), // ✅ NEW
          totalRegistrations: Number(regRow.totalRegistrations || 0),
          totalFoodOrders: Number(foodRow.totalFoodOrders || 0),
          liveEvents: Number(liveRow.liveEvents || 0), // ✅ FIXED
        },
        recentRegistrations: recent || [],
      },
    });
  } catch (e) {
    console.error("Admin dashboard error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load dashboard" });
  }
};
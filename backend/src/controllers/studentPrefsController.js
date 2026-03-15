const pool = require("../config/db");

// GET /api/student/prefs
exports.getPrefs = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT announcements, live_updates, payment_reminders, email_alerts
       FROM student_preferences
       WHERE user_id=?`,
      [userId]
    );

    // create default row if first time
    if (!rows.length) {
      await pool.query(
        `INSERT INTO student_preferences (user_id, announcements, live_updates, payment_reminders, email_alerts)
         VALUES (?, 1, 1, 0, 0)`,
        [userId]
      );

      return res.json({
        ok: true,
        data: { announcements: true, liveUpdates: true, paymentReminders: false, emailAlerts: false },
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
  } catch (e) {
    console.error("getPrefs error:", e);
    return res.status(500).json({ ok: false, message: "Failed to load preferences" });
  }
};

// PATCH /api/student/prefs
exports.updatePrefs = async (req, res) => {
  try {
    const userId = req.user.id;

    const announcements = req.body.announcements ? 1 : 0;
    const liveUpdates = req.body.liveUpdates ? 1 : 0;
    const paymentReminders = req.body.paymentReminders ? 1 : 0;
    const emailAlerts = req.body.emailAlerts ? 1 : 0;

    await pool.query(
      `INSERT INTO student_preferences (user_id, announcements, live_updates, payment_reminders, email_alerts)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         announcements=VALUES(announcements),
         live_updates=VALUES(live_updates),
         payment_reminders=VALUES(payment_reminders),
         email_alerts=VALUES(email_alerts)`,
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
  } catch (e) {
    console.error("updatePrefs error:", e);
    return res.status(500).json({ ok: false, message: "Failed to update preferences" });
  }
};
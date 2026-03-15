const router = require("express").Router();
const pool = require("../config/db");

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM event_categories ORDER BY name ASC");
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
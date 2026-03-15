const pool = require("../config/db");

async function listCategories(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT id, name FROM event_categories ORDER BY id ASC");
    res.json({ ok: true, data: rows });
  } catch (e) {
    next(e);
  }
}

// You said you haven't inserted rows. This creates 7 categories quickly.
async function seedCategories(req, res, next) {
  try {
    const categories = [
      "Cultural",
      "Technical",
      "Sports",
      "Literary",
      "Workshops",
      "Proshows",
      "Gaming",
    ];

    for (const name of categories) {
      await pool.query(
        "INSERT INTO event_categories (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name",
        [name]
      );
    }

    res.json({ ok: true, message: "Categories inserted/ensured ✅" });
  } catch (e) {
    next(e);
  }
}

module.exports = { listCategories, seedCategories };
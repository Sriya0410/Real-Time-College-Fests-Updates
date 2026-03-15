const mysql = require("mysql2/promise");
const path = require("path");

// ✅ always load .env from backend root
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const DB_NAME = process.env.DB_NAME || "college_fests_db";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+05:30",
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ MySQL Connected → Database: ${DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
  }
})();

module.exports = pool;
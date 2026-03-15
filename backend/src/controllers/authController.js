const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "secret", {
    expiresIn: "7d",
  });
}

/* ================= ADMIN LOGIN ================= */
async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT id, full_name, email, password, is_active, role FROM admins WHERE email=? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    }

    const admin = rows[0];

    if (Number(admin.is_active) !== 1) {
      return res
        .status(403)
        .json({ ok: false, message: "Account is inactive" });
    }

    const ok = admin.password?.startsWith("$2")
      ? await bcrypt.compare(password, admin.password)
      : password === admin.password;

    if (!ok) {
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    }

    const role = String(admin.role || "ADMIN").toUpperCase();

    const token = makeToken({
      id: admin.id,
      full_name: admin.full_name || "Admin",
      role,
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: admin.id,
        full_name: admin.full_name || "Admin",
        email: admin.email,
        role,
      },
    });
  } catch (e) {
    console.error("adminLogin error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

/* ================= STUDENT LOGIN ================= */
async function studentLogin(req, res) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      "SELECT id, full_name, email, password, is_active FROM users WHERE email=? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    }

    const user = rows[0];

    if (user.is_active !== undefined && Number(user.is_active) !== 1) {
      return res
        .status(403)
        .json({ ok: false, message: "Account is inactive" });
    }

    const ok = user.password?.startsWith("$2")
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!ok) {
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    }

    const token = makeToken({
      id: user.id,
      full_name: user.full_name || "Student",
      role: "STUDENT",
    });

    return res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name || "Student",
        email: user.email,
        role: "STUDENT",
      },
    });
  } catch (e) {
    console.error("studentLogin error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

/* ================= STUDENT REGISTER ================= */
async function registerStudent(req, res) {
  try {
    const { full_name, reg_no, email, phone, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "full_name, email, password required",
      });
    }

    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email=? LIMIT 1",
      [email]
    );

    if (exists.length) {
      return res
        .status(409)
        .json({ ok: false, message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (full_name, reg_no, email, phone, password, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [full_name, reg_no || null, email, phone || null, hash]
    );

    return res
      .status(201)
      .json({ ok: true, message: "Student registered successfully" });
  } catch (e) {
    console.error("registerStudent error:", e);
    return res.status(500).json({
      ok: false,
      message: e?.message || "Server error",
    });
  }
}

module.exports = { adminLogin, studentLogin, registerStudent };
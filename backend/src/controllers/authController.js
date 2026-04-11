const pool = require("../config/db");
const jwt = require("jsonwebtoken");

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "secret", {
    expiresIn: "7d",
  });
}

function makeResetToken(payload) {
  return jwt.sign(payload, process.env.RESET_PASSWORD_SECRET || "reset_secret", {
    expiresIn: "15m",
  });
}

function verifyResetToken(token) {
  return jwt.verify(
    token,
    process.env.RESET_PASSWORD_SECRET || "reset_secret"
  );
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

    const ok = String(admin.password || "") === String(password || "");

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

    const ok = String(user.password || "") === String(password || "");

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

    await pool.query(
      `INSERT INTO users (full_name, reg_no, email, phone, password, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [full_name, reg_no || null, email, phone || null, password]
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

/* ================= STUDENT FORGOT PASSWORD ================= */
async function requestStudentPasswordReset(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email is required",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, email, full_name, is_active FROM users WHERE email=? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        message: "No student account found with this email",
      });
    }

    const user = rows[0];

    if (user.is_active !== undefined && Number(user.is_active) !== 1) {
      return res.status(403).json({
        ok: false,
        message: "Account is inactive",
      });
    }

    const resetToken = makeResetToken({
      id: user.id,
      email: user.email,
      type: "STUDENT",
      purpose: "reset_password",
    });

    return res.json({
      ok: true,
      message: "Reset token generated",
      resetToken,
    });
  } catch (e) {
    console.error("requestStudentPasswordReset error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

async function resetStudentPassword(req, res) {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        ok: false,
        message: "token, password, confirmPassword required",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        ok: false,
        message: "Password must be at least 4 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        ok: false,
        message: "Passwords do not match",
      });
    }

    const decoded = verifyResetToken(token);

    if (
      decoded?.purpose !== "reset_password" ||
      decoded?.type !== "STUDENT" ||
      !decoded?.id
    ) {
      return res.status(400).json({
        ok: false,
        message: "Invalid or expired reset token",
      });
    }

    await pool.query("UPDATE users SET password=? WHERE id=?", [
      password,
      Number(decoded.id),
    ]);

    return res.json({
      ok: true,
      message: "Student password reset successful",
    });
  } catch (e) {
    console.error("resetStudentPassword error:", e);
    return res.status(400).json({
      ok: false,
      message: "Invalid or expired reset token",
    });
  }
}

/* ================= ADMIN FORGOT PASSWORD ================= */
async function requestAdminPasswordReset(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: "Email is required",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, email, full_name, is_active, role FROM admins WHERE email=? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        message: "No admin account found with this email",
      });
    }

    const admin = rows[0];

    if (Number(admin.is_active) !== 1) {
      return res.status(403).json({
        ok: false,
        message: "Account is inactive",
      });
    }

    const resetToken = makeResetToken({
      id: admin.id,
      email: admin.email,
      type: "ADMIN",
      purpose: "reset_password",
      role: String(admin.role || "ADMIN").toUpperCase(),
    });

    return res.json({
      ok: true,
      message: "Reset token generated",
      resetToken,
    });
  } catch (e) {
    console.error("requestAdminPasswordReset error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

async function resetAdminPassword(req, res) {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        ok: false,
        message: "token, password, confirmPassword required",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        ok: false,
        message: "Password must be at least 4 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        ok: false,
        message: "Passwords do not match",
      });
    }

    const decoded = verifyResetToken(token);

    if (
      decoded?.purpose !== "reset_password" ||
      decoded?.type !== "ADMIN" ||
      !decoded?.id
    ) {
      return res.status(400).json({
        ok: false,
        message: "Invalid or expired reset token",
      });
    }

    await pool.query("UPDATE admins SET password=? WHERE id=?", [
      password,
      Number(decoded.id),
    ]);

    return res.json({
      ok: true,
      message: "Admin password reset successful",
    });
  } catch (e) {
    console.error("resetAdminPassword error:", e);
    return res.status(400).json({
      ok: false,
      message: "Invalid or expired reset token",
    });
  }
}

module.exports = {
  adminLogin,
  studentLogin,
  registerStudent,
  requestStudentPasswordReset,
  resetStudentPassword,
  requestAdminPasswordReset,
  resetAdminPassword,
};
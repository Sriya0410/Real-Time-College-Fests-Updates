const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { initSocket } = require("./config/socket");

// routes
const eventRoutes = require("./routes/eventRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const studentRoutes = require("./routes/studentRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRegistrationRoutes = require("./routes/adminRegistrationRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const liveUpdateRoutes = require("./routes/liveUpdateRoutes");
const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const lostFoundRoutes = require("./routes/lostFoundRoutes");
const adminLostFoundRoutes = require("./routes/adminLostFoundRoutes");
const adminOrdersRoutes = require("./routes/adminFoodOrdersRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const refundRoutes = require("./routes/refundRoutes");
const verifiedUpdateRoutes = require("./routes/verifiedUpdateRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const certificateRoutes = require("./routes/certificateRoutes");

const app = express();
const server = http.createServer(app);

// CORS
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  process.env.FRONTEND_BASE_URL || "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  })
);

// body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// debug
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// static
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));

// basic
app.use("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// auth
app.use("/api/auth", authRoutes);

// main routes
app.use("/api/events", eventRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/live-updates", liveUpdateRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/lostfound", lostFoundRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/verified-updates", verifiedUpdateRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/certificates", certificateRoutes);

// admin routes
app.use("/api/admin/registrations", adminRegistrationRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/admin", adminOrdersRoutes);
app.use("/api/admin", adminLostFoundRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// error handler
app.use((err, _req, res, _next) => {
  console.error("❌ Server error:", err);

  res.status(500).json({
    ok: false,
    message: err?.message || "Server error",
  });
});

// socket
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
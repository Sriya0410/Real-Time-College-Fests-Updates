const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  registerEvent,
  getMyRegistrations,
  getMyPayments,
  getCompletedEvents,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,

  // ✅ NEW
  getStudentStats,
  getMyPrefs,
  updateMyPrefs,
} = require("../controllers/studentController");

// ✅ secure
router.post("/register", auth, registerEvent);

// ✅ student data
router.get("/registrations", auth, getMyRegistrations);
router.get("/payments", auth, getMyPayments);

// ✅ NEW: stats
router.get("/stats", auth, getStudentStats);

// ✅ completed events (your code had no auth; keep as you like)
router.get("/completed-events", getCompletedEvents);

// ✅ profile
router.get("/me", auth, getMyProfile);
router.patch("/me", auth, updateMyProfile);
router.patch("/change-password", auth, changeMyPassword);

// ✅ NEW: preferences (DB)
router.get("/prefs", auth, getMyPrefs);
router.patch("/prefs", auth, updateMyPrefs);

module.exports = router;
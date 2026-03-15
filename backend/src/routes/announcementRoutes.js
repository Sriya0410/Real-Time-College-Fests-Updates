const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  listAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
} = require("../controllers/announcementController");

// ✅ PUBLIC (students can read; no token needed)
router.get("/", listAnnouncements);

// ✅ ADMIN ONLY (everything below)
router.use(auth, role(["ADMIN"]));
router.post("/", createAnnouncement);
router.patch("/:id/toggle", toggleAnnouncement);

module.exports = router;
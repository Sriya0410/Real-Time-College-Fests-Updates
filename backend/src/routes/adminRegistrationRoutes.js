const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getAllRegistrations,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
} = require("../controllers/adminRegistrationController");

// ✅ ADMIN only
router.get("/", auth, role(["ADMIN"]), getAllRegistrations);
router.get("/pending", auth, role(["ADMIN"]), getPendingRegistrations);
router.put("/:id/approve", auth, role(["ADMIN"]), approveRegistration);
router.put("/:id/reject", auth, role(["ADMIN"]), rejectRegistration);

module.exports = router;
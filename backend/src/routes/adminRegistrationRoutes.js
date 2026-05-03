const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getAllRegistrations,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
} = require("../controllers/adminRegistrationController");

// ✅ Admin + Student Affairs can view all registrations
router.get(
  "/",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  getAllRegistrations
);

// ✅ Admin + Student Affairs can view pending registrations
router.get(
  "/pending",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  getPendingRegistrations
);

// ✅ Admin + Student Affairs can approve registrations
router.put(
  "/:id/approve",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  approveRegistration
);

// ✅ Admin + Student Affairs can reject registrations
router.put(
  "/:id/reject",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  rejectRegistration
);

module.exports = router;
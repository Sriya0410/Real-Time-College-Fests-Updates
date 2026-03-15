const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const analyticsController = require("../controllers/analyticsController");

// events dropdown
router.get(
  "/events",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  analyticsController.listEvents
);

// attendance
router.get(
  "/:eventId/attendance/summary",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  analyticsController.getAttendanceSummary
);

// revenue
router.get(
  "/:eventId/revenue",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  analyticsController.getRevenue
);

// expenses
router.get(
  "/:eventId/expenses",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  analyticsController.listExpenses
);

router.post(
  "/:eventId/expenses",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  analyticsController.addExpense
);

module.exports = router;
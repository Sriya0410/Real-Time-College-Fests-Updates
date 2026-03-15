const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const { getDashboard } = require("../controllers/adminDashboardController");

router.get("/dashboard", auth, role(["ADMIN", "STUDENT_AFFAIRS"]), getDashboard);

module.exports = router;
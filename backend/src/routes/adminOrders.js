const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const { listOrders, markPaid, updateStatus } = require("../controllers/adminFoodOrdersController");

// admin only
router.get("/orders", auth, role(["ADMIN"]), listOrders);
router.patch("/orders/:id/paid", auth, role(["ADMIN"]), markPaid);
router.patch("/orders/:id/status", auth, role(["ADMIN"]), updateStatus);

module.exports = router;
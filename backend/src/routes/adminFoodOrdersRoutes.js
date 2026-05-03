const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  listOrders,
  getAdminOrderReceipt,
  markPaid,
  updateStatus,
} = require("../controllers/adminFoodOrdersController");

// ✅ Admin + Student Affairs can view food orders
router.get(
  "/orders",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  listOrders
);

// ✅ Admin + Student Affairs can view receipt
router.get(
  "/orders/:id/receipt",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  getAdminOrderReceipt
);

// ✅ Admin + Student Affairs can mark cash orders as paid
router.patch(
  "/orders/:id/paid",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  markPaid
);

// ✅ Admin + Student Affairs can update order status
router.patch(
  "/orders/:id/status",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS"]),
  updateStatus
);

module.exports = router;
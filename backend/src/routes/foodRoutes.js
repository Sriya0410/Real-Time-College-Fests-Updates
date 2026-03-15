const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  listStalls,
  listItemsByStall,
  createOrder,
  myOrders,
  createFoodRazorpayOrder,
  verifyFoodRazorpayPayment,
  cancelFoodRazorpayPayment,

  // ✅ new
  getFoodOrderReceipt,
  cancelMyFoodOrder,
} = require("../controllers/foodController");

router.get("/stalls", listStalls);
router.get("/stalls/:stallId/items", listItemsByStall);

// CASH
router.post("/orders", auth, createOrder);

// RAZORPAY
router.post("/orders/razorpay/order", auth, createFoodRazorpayOrder);
router.post("/orders/razorpay/verify", auth, verifyFoodRazorpayPayment);
router.post("/orders/razorpay/cancel", auth, cancelFoodRazorpayPayment);

// student orders
router.get("/orders/my", auth, myOrders);

// ✅ receipt + cancel
router.get("/orders/:id/receipt", auth, getFoodOrderReceipt);
router.post("/orders/:id/cancel", auth, cancelMyFoodOrder);

module.exports = router;
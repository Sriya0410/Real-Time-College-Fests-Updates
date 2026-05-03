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
  getFoodOrderReceipt,
  cancelMyFoodOrder,
  fakeFoodUpiPaymentConfirm,
} = require("../controllers/foodController");

router.get("/stalls", listStalls);
router.get("/stalls/:stallId/items", listItemsByStall);

// CASH ORDER
router.post("/orders", auth, createOrder);

// REAL RAZORPAY - keep for future if needed
router.post("/orders/razorpay/order", auth, createFoodRazorpayOrder);
router.post("/orders/razorpay/verify", auth, verifyFoodRazorpayPayment);
router.post("/orders/razorpay/cancel", auth, cancelFoodRazorpayPayment);

// CUSTOM UPI DEMO PAYMENT
router.post("/orders/upi/fake-confirm", auth, fakeFoodUpiPaymentConfirm);

// STUDENT ORDERS
router.get("/orders/my", auth, myOrders);
router.get("/orders/:id/receipt", auth, getFoodOrderReceipt);
router.post("/orders/:id/cancel", auth, cancelMyFoodOrder);

module.exports = router;
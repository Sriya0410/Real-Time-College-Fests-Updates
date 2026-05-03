const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  cancelRazorpayRegistration,
  fakeUpiPaymentConfirm,
  getMyPayments,
  refundPaymentById,
} = require("../controllers/paymentController");

// Real Razorpay routes - keep for future use
router.post("/razorpay/order", auth, createRazorpayOrder);
router.post("/razorpay/verify", auth, verifyRazorpayPayment);
router.post("/razorpay/cancel", auth, cancelRazorpayRegistration);

// Custom Razorpay-style UPI demo payment
router.post("/upi/fake-confirm", auth, fakeUpiPaymentConfirm);

// Payment history
router.get("/my", auth, getMyPayments);

// Optional refund
router.post("/:paymentId/refund", auth, refundPaymentById);

module.exports = router;
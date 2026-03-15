const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  cancelRazorpayRegistration,
} = require("../controllers/paymentController");

router.post("/razorpay/order", auth, createRazorpayOrder);
router.post("/razorpay/verify", auth, verifyRazorpayPayment);

// ✅ your frontend calls this on modal close
router.post("/razorpay/cancel", auth, cancelRazorpayRegistration);

module.exports = router;
const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { listMyRefunds, getRefundReceipt } = require("../controllers/refundController");

// ✅ My refunds (must be logged in)
router.get("/my", auth, listMyRefunds);

// ✅ Receipt (must be owner)
router.get("/:id/receipt", auth, getRefundReceipt);

module.exports = router;
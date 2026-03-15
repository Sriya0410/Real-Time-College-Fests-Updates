const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

const c = require("../controllers/verifiedUpdateController");

// student + admin
router.get("/", auth, c.listVerifiedUpdates);
router.get("/verify", auth, c.verifyByCode);

// admin only
router.post("/", auth, requireAdmin, c.createVerifiedUpdate);
router.patch("/:id/toggle", auth, requireAdmin, c.toggleVerifiedUpdate);

module.exports = router;
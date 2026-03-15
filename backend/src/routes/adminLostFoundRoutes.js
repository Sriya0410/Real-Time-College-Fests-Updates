const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const { adminListLostFound, adminUpdateLFStatus } = require("../controllers/lostFoundController");

router.get("/lostfound", auth, adminListLostFound);
router.patch("/lostfound/:id/status", auth, adminUpdateLFStatus);

module.exports = router;
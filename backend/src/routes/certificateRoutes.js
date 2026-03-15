const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const certificateController = require("../controllers/certificateController");

router.get("/my", auth, certificateController.getMyCertificates);
router.get("/dashboard", auth, certificateController.getMyCertificateDashboard);
router.get("/verify/:certificateNo", certificateController.verifyCertificate);
router.get("/:eventId/eligibility", auth, certificateController.checkEligibility);
router.get("/:eventId/download", auth, certificateController.downloadCertificate);

module.exports = router;
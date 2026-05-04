const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const certificateController = require("../controllers/certificateController");

router.get("/my", auth, certificateController.getMyCertificates);
router.get("/dashboard", auth, certificateController.getMyCertificateDashboard);
router.get("/verify/:certificateNo", certificateController.verifyCertificate);
router.get("/:eventId/eligibility", auth, certificateController.checkEligibility);

// open certificate as HTML
router.get("/:eventId/download", auth, certificateController.downloadCertificate);

// download certificate as PDF
router.get("/:eventId/download-pdf", auth, certificateController.downloadCertificatePdf);

module.exports = router;
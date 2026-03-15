const router = require("express").Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const registrationController = require("../controllers/registrationController");

// Create registration
router.post("/", registrationController.createRegistration);

// must be BEFORE dynamic routes
router.get("/verify", registrationController.verifyTicketByToken);

// admin/staff/volunteer qr check-in
router.post(
  "/checkin",
  auth,
  role(["ADMIN", "STUDENT_AFFAIRS", "VOLUNTEER"]),
  registrationController.checkinTicket
);

// my registrations
router.get("/my/:userId", registrationController.getMyRegistrations);

// my payments
router.get("/my/:userId/payments", registrationController.getMyPayments);
router.get("/payments/:userId", registrationController.getMyPayments);

// ticket
router.get("/:registrationId/ticket", registrationController.getTicket);
router.get("/ticket/:registrationId", registrationController.getTicket);

// cancel
router.post("/:registrationId/cancel", registrationController.cancelRegistration);
router.post("/cancel/:registrationId", registrationController.cancelRegistration);

module.exports = router;
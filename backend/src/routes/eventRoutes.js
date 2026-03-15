const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  setEventStatus,
  deleteEvent,
} = require("../controllers/eventController");

// student: list
router.get("/", listEvents);
router.get("/:id", getEventById);

// admin
router.post("/", auth, role(["ADMIN"]), createEvent);
router.put("/:id", auth, role(["ADMIN"]), updateEvent);
router.patch("/:id/status", auth, role(["ADMIN"]), setEventStatus);
router.delete("/:id", auth, role(["ADMIN"]), deleteEvent);

module.exports = router;
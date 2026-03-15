const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  listLiveUpdates,
  createLiveUpdate,
  deleteLiveUpdate,
} = require("../controllers/liveUpdateController");

// PUBLIC
router.get("/", listLiveUpdates);

// ADMIN
router.post("/", auth, role(["ADMIN"]), createLiveUpdate);
router.delete("/:id", auth, role(["ADMIN"]), deleteLiveUpdate);

module.exports = router;
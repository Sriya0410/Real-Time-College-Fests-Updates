const router = require("express").Router();
const {
  adminLogin,
  studentLogin,
  registerStudent,
} = require("../controllers/authController");

router.post("/admin/login", adminLogin);
router.post("/student/login", studentLogin);
router.post("/student/register", registerStudent);

module.exports = router;
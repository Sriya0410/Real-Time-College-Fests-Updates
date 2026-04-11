const router = require("express").Router();
const {
  adminLogin,
  studentLogin,
  registerStudent,
  requestStudentPasswordReset,
  resetStudentPassword,
  requestAdminPasswordReset,
  resetAdminPassword,
} = require("../controllers/authController");

router.post("/admin/login", adminLogin);
router.post("/student/login", studentLogin);
router.post("/student/register", registerStudent);

// forgot password - student
router.post("/student/forgot-password", requestStudentPasswordReset);
router.post("/student/reset-password", resetStudentPassword);

// forgot password - admin
router.post("/admin/forgot-password", requestAdminPasswordReset);
router.post("/admin/reset-password", resetAdminPassword);

module.exports = router;
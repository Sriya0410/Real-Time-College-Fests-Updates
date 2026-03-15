const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  listLostFound,
  createLostFound,
  listMyLostFound,
  getLostFoundReceipt,
} = require("../controllers/lostFoundController");

// ✅ ensure folder exists
const uploadDir = path.join(process.cwd(), "uploads", "lostfound");
fs.mkdirSync(uploadDir, { recursive: true });

// ✅ multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"));
    cb(null, true);
  },
});

// ✅ All items (public)
router.get("/", listLostFound);

// ✅ Create report (auth)
router.post("/", auth, upload.single("image"), createLostFound);

// ✅ My reports (auth)
router.get("/my", auth, listMyLostFound);

// ✅ Receipt (auth + only own report)
router.get("/:id/receipt", auth, getLostFoundReceipt);

module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

const ALLOWED_TYPES = ["video/mp4", "video/quicktime"];
const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "500");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Nur MP4 und MOV Dateien erlaubt"));
    }
  },
});

router.post("/", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei hochgeladen" });

  const jobId = path.parse(req.file.filename).name;
  res.json({
    jobId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});

router.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: `Datei zu groß (max. ${MAX_MB} MB)` });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;

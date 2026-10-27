const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { createJob } = require("../services/jobs");

const router = express.Router();

const ALLOWED_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_EXTS = [".mp4", ".mov"];
const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "500");

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ALLOWED_EXTS.includes(ext) ? ext : ".mp4"}`);
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

function uploadErrorHandler(err, _req, res, _next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: `Datei zu groß (max. ${MAX_MB} MB)` });
  }
  res.status(400).json({ error: err.message });
}

router.post("/", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei hochgeladen" });

  const jobId = path.parse(req.file.filename).name;
  createJob({ id: jobId, userId: req.user.id, filename: req.file.filename });
  res.json({
    jobId,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
  });
});

router.use(uploadErrorHandler);

module.exports = router;
module.exports.upload = upload;
module.exports.uploadErrorHandler = uploadErrorHandler;

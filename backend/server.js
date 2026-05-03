require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const uploadRoute = require("./routes/upload");
const transcribeRoute = require("./routes/transcribe");
const renderRoute = require("./routes/render");

const app = express();
const PORT = process.env.PORT || 3001;

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const OUTPUTS_DIR = path.join(__dirname, "../outputs");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// Beim Start: Reste aus alten Sessions löschen
function cleanupOnStart() {
  let count = 0;
  for (const dir of [UPLOADS_DIR, OUTPUTS_DIR]) {
    const files = fs.readdirSync(dir).filter((f) => f !== ".gitkeep");
    for (const file of files) {
      try { fs.unlinkSync(path.join(dir, file)); count++; } catch {}
    }
  }
  if (count > 0) console.log(`${count} alte Datei(en) beim Start bereinigt.`);
}
cleanupOnStart();

const isProd = process.env.NODE_ENV === "production";
app.use(cors({ origin: isProd ? false : (process.env.CORS_ORIGIN || "http://localhost:5173") }));
app.use(express.json());

app.use("/api/upload", uploadRoute);
app.use("/api/transcribe", transcribeRoute);
app.use("/api/render", renderRoute);

app.get("/api/download/:jobId", (req, res) => {
  const filePath = path.join(OUTPUTS_DIR, `${req.params.jobId}_output.mp4`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.download(filePath, "crispy_captions_output.mp4", (err) => {
    // Nach erfolgreichem Download Output-Datei löschen
    if (!err && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// In Production: gebautes Frontend ausliefern
if (isProd) {
  const distPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));

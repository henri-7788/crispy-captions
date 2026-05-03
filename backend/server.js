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

fs.mkdirSync(path.join(__dirname, "../uploads"), { recursive: true });
fs.mkdirSync(path.join(__dirname, "../outputs"), { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/upload", uploadRoute);
app.use("/api/transcribe", transcribeRoute);
app.use("/api/render", renderRoute);

app.get("/api/download/:jobId", (req, res) => {
  const filePath = path.join(__dirname, "../outputs", `${req.params.jobId}_output.mp4`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.download(filePath, "crispy_captions_output.mp4");
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));

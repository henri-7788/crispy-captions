require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const { requireAuth } = require("./middleware/auth");
const { getOwnedJob } = require("./services/jobs");
const authRoute = require("./routes/auth");
const adminRoute = require("./routes/admin");
const apiRoute = require("./routes/api");
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
// Hinter einem Reverse-Proxy: echte Client-IP aus X-Forwarded-For (wichtig fürs Rate-Limiting)
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}
app.use(cors({ origin: isProd ? false : (process.env.CORS_ORIGIN || "http://localhost:5173") }));
app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/v1", requireAuth, apiRoute);
app.use("/api/upload", requireAuth, uploadRoute);
app.use("/api/transcribe", requireAuth, transcribeRoute);
app.use("/api/render", requireAuth, renderRoute);

app.get("/api/download/:jobId", requireAuth, (req, res) => {
  const job = getOwnedJob(req.params.jobId, req.user.id);
  if (!job) return res.status(404).json({ error: "File not found" });
  // Nach erfolgreichem Download wird die Output-Datei gelöscht
  apiRoute.sendOutput(job, res);
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// In Production: gebautes Frontend ausliefern
if (isProd) {
  const distPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));

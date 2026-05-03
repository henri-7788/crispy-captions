const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");
const { generateASS } = require("../utils/assGenerator");

const router = express.Router();

// Schreibt ASS ins System-Temp-Verzeichnis (kurzer, sicherer Pfad ohne Sonderzeichen)
function getTempAssPath(jobId) {
  return path.join(os.tmpdir(), `${jobId}.ass`);
}

// Für FFmpeg-Filter auf Windows: Backslashes → Forward-Slashes, Doppelpunkt escapen
function toFFmpegPath(absPath) {
  return absPath.replace(/\\/g, "/").replace(":/", "\\:/");
}

router.post("/", (req, res) => {
  const { jobId, filename, words, style } = req.body;
  if (!jobId || !filename || !words) {
    return res.status(400).json({ error: "jobId, filename und words erforderlich" });
  }

  const videoPath = path.join(__dirname, "../../uploads", filename);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video nicht gefunden" });
  }

  // SSE-Stream öffnen
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendSSE = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // ASS in System-Temp schreiben (sicherer Pfad)
  const assContent = generateASS(words, style || {});
  const assPath = getTempAssPath(jobId);
  fs.writeFileSync(assPath, assContent, "utf8");

  const outputPath = path.join(__dirname, "../../outputs", `${jobId}_output.mp4`);
  const fontsDir = path.join(__dirname, "../../");
  const filterStr = `ass=${toFFmpegPath(assPath)}:fontsdir=${toFFmpegPath(fontsDir)}`;
  console.log("FFmpeg filter:", filterStr);

  sendSSE({ type: "progress", percent: 0, step: "Rendering..." });

  ffmpeg(videoPath)
    .videoFilters(filterStr)
    .outputOptions([
      "-c:v libx264",
      "-preset fast",
      "-crf 23",
      "-c:a copy",
      "-pix_fmt yuv420p",  // Pixel-Format explizit setzen (verhindert "Invalid argument")
    ])
    .output(outputPath)
    .on("progress", ({ percent }) => {
      sendSSE({ type: "progress", percent: Math.round(percent || 0) });
    })
    .on("end", () => {
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      sendSSE({ type: "done", downloadUrl: `/api/download/${jobId}` });
      res.end();
    })
    .on("error", (err, stdout, stderr) => {
      console.error("FFmpeg-Fehler:", err.message);
      console.error("FFmpeg stderr:", stderr);
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      sendSSE({ type: "error", message: err.message });
      res.end();
    })
    .run();
});

module.exports = router;

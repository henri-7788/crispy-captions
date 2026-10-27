const express = require("express");
const fs = require("fs");
const path = require("path");
const { db } = require("../db");
const { upload, uploadErrorHandler } = require("./upload");
const { transcribe } = require("../services/transcription");
const { renderVideo, getOutputPath } = require("../services/renderer");
const { createJob, getOwnedJob, updateJob, getUploadPath } = require("../services/jobs");
const { normalizeStyle } = require("../utils/style");
const { enqueue } = require("../services/queue");
const { checkTranscriptionQuota, recordTranscription } = require("../services/quota");

const router = express.Router();

async function processJob(jobId, style) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  // User könnte inzwischen gelöscht worden sein
  if (!job) return;
  const videoPath = getUploadPath(job);

  try {
    updateJob(jobId, { status: "transcribing", progress: 0 });
    recordTranscription(job.user_id);
    const words = await transcribe(videoPath, jobId);
    if (words.length === 0) throw new Error("Keine Sprache im Video erkannt");

    updateJob(jobId, { status: "rendering", progress: 0 });
    let lastPercent = -1;
    await renderVideo({
      jobId,
      videoPath,
      words,
      style,
      onProgress: (percent) => {
        if (percent === lastPercent) return;
        lastPercent = percent;
        updateJob(jobId, { progress: percent });
      },
    });
    updateJob(jobId, { status: "done", progress: 100 });
  } catch (err) {
    console.error(`[api] Job ${jobId} fehlgeschlagen:`, err.message);
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    updateJob(jobId, { status: "error", error: err.message });
  }
}

function serializeJob(job) {
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error || undefined,
    createdAt: job.created_at,
    downloadUrl: job.status === "done" ? `/api/v1/jobs/${job.id}/download` : undefined,
  };
}

// ---- Routen ----

// Vor dem Upload prüfen, damit keine Datei umsonst hochgeladen wird
function requireQuota(req, res, next) {
  const quotaError = checkTranscriptionQuota(req.user);
  if (quotaError) return res.status(429).json({ error: quotaError });
  next();
}

router.post("/jobs", requireQuota, upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Feld 'video' (MP4/MOV) erforderlich" });

  let styleInput = {};
  if (req.body.style) {
    try {
      styleInput = JSON.parse(req.body.style);
    } catch {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "'style' muss gültiges JSON sein" });
    }
  }

  const jobId = path.parse(req.file.filename).name;
  createJob({ id: jobId, userId: req.user.id, filename: req.file.filename, source: "api" });
  updateJob(jobId, { status: "queued" });

  const style = normalizeStyle(styleInput);
  enqueue(() => processJob(jobId, style));

  res.status(202).json({ jobId, status: "queued", statusUrl: `/api/v1/jobs/${jobId}`, style });
});

router.get("/jobs", (req, res) => {
  const jobs = db
    .prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(req.user.id);
  res.json({ jobs: jobs.map(serializeJob) });
});

router.get("/jobs/:id", (req, res) => {
  const job = getOwnedJob(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: "Job nicht gefunden" });
  res.json(serializeJob(job));
});

router.get("/jobs/:id/download", (req, res) => {
  const job = getOwnedJob(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: "Job nicht gefunden" });
  if (job.status !== "done") return res.status(409).json({ error: `Job ist noch nicht fertig (Status: ${job.status})` });
  sendOutput(job, res);
});

// Liefert das fertige Video aus und löscht es danach (wie im Web-Flow)
function sendOutput(job, res) {
  const filePath = getOutputPath(job.id);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: "Datei wurde bereits heruntergeladen oder ist abgelaufen" });
  }
  res.download(filePath, "crispy_captions_output.mp4", (err) => {
    if (!err && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      updateJob(job.id, { status: "downloaded" });
    }
  });
}

router.use(uploadErrorHandler);

module.exports = router;
module.exports.sendOutput = sendOutput;

const express = require("express");
const fs = require("fs");
const { transcribe } = require("../services/transcription");
const { getOwnedJob, updateJob, getUploadPath } = require("../services/jobs");
const { checkTranscriptionQuota, recordTranscription } = require("../services/quota");

const router = express.Router();

router.post("/", async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: "jobId erforderlich" });
  }

  const job = getOwnedJob(jobId, req.user.id);
  const videoPath = job && getUploadPath(job);
  if (!job || !fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video nicht gefunden" });
  }

  const quotaError = checkTranscriptionQuota(req.user);
  if (quotaError) return res.status(429).json({ error: quotaError });

  try {
    updateJob(job.id, { status: "transcribing" });
    recordTranscription(req.user.id);
    const words = await transcribe(videoPath, job.id);
    updateJob(job.id, { status: "uploaded" });
    res.json({ jobId: job.id, words });
  } catch (err) {
    console.error("Whisper-Fehler:", err);
    updateJob(job.id, { status: "error", error: err.message });
    res.status(502).json({ error: `Whisper API Fehler: ${err.message}` });
  }
});

module.exports = router;

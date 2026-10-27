const express = require("express");
const fs = require("fs");
const { renderVideo } = require("../services/renderer");
const { getOwnedJob, updateJob, getUploadPath } = require("../services/jobs");
const { normalizeStyle } = require("../utils/style");
const { enqueue, isBusy } = require("../services/queue");

const router = express.Router();

router.post("/", (req, res) => {
  const { jobId, words, style } = req.body;
  if (!jobId || !Array.isArray(words)) {
    return res.status(400).json({ error: "jobId und words erforderlich" });
  }

  const job = getOwnedJob(jobId, req.user.id);
  const videoPath = job && getUploadPath(job);
  if (!job || !fs.existsSync(videoPath)) {
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

  // Client weg, bevor der Render startet → Slot nicht verschwenden
  let clientGone = false;
  res.on("close", () => { clientGone = true; });

  if (isBusy()) {
    updateJob(job.id, { status: "queued" });
    sendSSE({ type: "progress", percent: 0, step: "In Warteschlange..." });
  }

  // Render läuft über dieselbe Queue wie die API → MAX_CONCURRENT_RENDERS gilt für alle
  enqueue(() => {
    if (clientGone) {
      updateJob(job.id, { status: "error", error: "Abgebrochen" });
      return;
    }
    updateJob(job.id, { status: "rendering", progress: 0 });
    sendSSE({ type: "progress", percent: 0, step: "Rendering..." });

    return renderVideo({
      jobId: job.id,
      videoPath,
      words,
      style: normalizeStyle(style),
      onProgress: (percent) => sendSSE({ type: "progress", percent, step: "Rendering..." }),
    })
      .then(() => {
        updateJob(job.id, { status: "done", progress: 100 });
        sendSSE({ type: "done", downloadUrl: `/api/download/${job.id}` });
        res.end();
      })
      .catch((err) => {
        updateJob(job.id, { status: "error", error: err.message });
        sendSSE({ type: "error", message: err.message });
        res.end();
      });
  });
});

module.exports = router;

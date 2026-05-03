const express = require("express");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AUDIO_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20 MB

async function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .output(audioPath)
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}

router.post("/", async (req, res) => {
  const { jobId, filename } = req.body;
  if (!jobId || !filename) {
    return res.status(400).json({ error: "jobId und filename erforderlich" });
  }

  const videoPath = path.join(__dirname, "../../uploads", filename);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: "Video nicht gefunden" });
  }

  let transcribeFilePath = videoPath;
  let tempAudioPath = null;

  try {
    const stats = fs.statSync(videoPath);
    if (stats.size > AUDIO_SIZE_THRESHOLD) {
      tempAudioPath = path.join(__dirname, "../../uploads", `${jobId}_audio.mp3`);
      await extractAudio(videoPath, tempAudioPath);
      transcribeFilePath = tempAudioPath;
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(transcribeFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const words = (transcription.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));

    res.json({ jobId, words });
  } catch (err) {
    console.error("Whisper-Fehler:", err);
    res.status(502).json({ error: `Whisper API Fehler: ${err.message}` });
  } finally {
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
  }
});

module.exports = router;

const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const ffmpeg = require("fluent-ffmpeg");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AUDIO_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20 MB
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

function extractAudio(videoPath, audioPath) {
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

// Transkribiert ein Video via Whisper → [{ word, start, end }]
async function transcribe(videoPath, jobId) {
  let transcribeFilePath = videoPath;
  let tempAudioPath = null;

  try {
    const stats = fs.statSync(videoPath);
    if (stats.size > AUDIO_SIZE_THRESHOLD) {
      tempAudioPath = path.join(UPLOADS_DIR, `${jobId}_audio.mp3`);
      await extractAudio(videoPath, tempAudioPath);
      transcribeFilePath = tempAudioPath;
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(transcribeFilePath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    return (transcription.words || []).map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    }));
  } finally {
    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
  }
}

module.exports = { transcribe };

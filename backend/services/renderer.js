const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");
const { generateASS } = require("../utils/assGenerator");

const OUTPUTS_DIR = path.join(__dirname, "../../outputs");

// Schreibt ASS ins System-Temp-Verzeichnis (kurzer, sicherer Pfad ohne Sonderzeichen)
function getTempAssPath(jobId) {
  return path.join(os.tmpdir(), `${jobId}.ass`);
}

// Für FFmpeg-Filter auf Windows: Backslashes → Forward-Slashes, Doppelpunkt escapen
function toFFmpegPath(absPath) {
  return absPath.replace(/\\/g, "/").replace(":/", "\\:/");
}

function getOutputPath(jobId) {
  return path.join(OUTPUTS_DIR, `${jobId}_output.mp4`);
}

// Angezeigte Videogröße: FFmpeg dreht Handyvideos vor dem Filter automatisch,
// daher bei 90°/270°-Rotation Breite und Höhe tauschen
function getDisplaySize(metadata) {
  const stream = metadata?.streams?.find((s) => s.codec_type === "video");
  if (!stream?.width || !stream?.height) return null;
  const rotation = Number(
    stream.tags?.rotate ?? stream.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0
  );
  const swapped = Math.abs(rotation) % 180 === 90;
  return swapped
    ? { width: stream.height, height: stream.width }
    : { width: stream.width, height: stream.height };
}

// Rendert Untertitel ins Video. Löscht danach ASS + Quellvideo.
function renderVideo({ jobId, videoPath, words, style, onProgress }) {
  return new Promise((resolve, reject) => {
    const assPath = getTempAssPath(jobId);

    // Font neben die ASS-Datei ins Temp-Verzeichnis kopieren → libass findet ihn sicher
    const tmpDir = os.tmpdir();
    const fontSrc = path.join(__dirname, "../../THEBOLDFONT-FREEVERSION.ttf");
    const fontTmp = path.join(tmpDir, "THEBOLDFONT-FREEVERSION.ttf");
    if (fs.existsSync(fontSrc) && !fs.existsSync(fontTmp)) {
      fs.copyFileSync(fontSrc, fontTmp);
    }

    const outputPath = getOutputPath(jobId);
    const filterStr = `ass=${toFFmpegPath(assPath)}:fontsdir=${toFFmpegPath(tmpDir)}`;
    console.log("[render] filter:", filterStr);

    const cleanup = () => {
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    };

    onProgress?.(0);

    ffmpeg.ffprobe(videoPath, (_probeErr, metadata) => {
      const totalDuration = metadata?.format?.duration || 0;

      // ASS in System-Temp schreiben (sicherer Pfad), Koordinaten = echte Videogröße
      const videoSize = getDisplaySize(metadata);
      const assContent = generateASS(words, style || {}, videoSize);
      fs.writeFileSync(assPath, assContent, "utf8");
      console.log(`[render] ASS: ${assPath} | ${videoSize ? `${videoSize.width}x${videoSize.height}` : "Standardgröße"} | ${(assContent.match(/^Dialogue:/gm) || []).length} Dialogue-Lines`);

      ffmpeg(videoPath)
        .videoFilters(filterStr)
        .outputOptions([
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-c:a copy",
          "-pix_fmt yuv420p",
        ])
        .output(outputPath)
        .on("start", (cmd) => console.log("[render] FFmpeg cmd:", cmd))
        .on("progress", ({ timemark }) => {
          let percent = 0;
          if (totalDuration > 0 && timemark) {
            const parts = timemark.split(":").map(parseFloat);
            const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
            percent = Math.min(99, Math.round((seconds / totalDuration) * 100));
          }
          onProgress?.(percent);
        })
        .on("end", () => {
          cleanup();
          resolve(outputPath);
        })
        .on("error", (err, _stdout, stderr) => {
          console.error("FFmpeg-Fehler:", err.message);
          console.error("FFmpeg stderr:", stderr);
          cleanup();
          reject(err);
        })
        .run();
    });
  });
}

module.exports = { renderVideo, getOutputPath };

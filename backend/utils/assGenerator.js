const DEFAULT_MAX_PER_CHUNK = 5;
const GAP_THRESHOLD = 0.5; // Sekunden Pause → neuer Chunk

function toASSTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

// #RRGGBB → &H00BBGGRR& (ASS-Farbformat ist BGR)
function toASSColor(hex) {
  const r = hex.slice(1, 3);
  const g = hex.slice(3, 5);
  const b = hex.slice(5, 7);
  return `&H00${b}${g}${r}&`;
}

function chunkWords(words, maxPerChunk = DEFAULT_MAX_PER_CHUNK) {
  const chunks = [];
  let current = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prev = words[i - 1];

    const speechGap = prev && (word.start - prev.end) > GAP_THRESHOLD;
    const chunkFull = current.length >= maxPerChunk;

    if ((speechGap || chunkFull) && current.length > 0) {
      chunks.push(current);
      current = [];
    }
    current.push(word);
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function buildHeader(style) {
  const primaryColor = toASSColor(style.highlightColor || "#FFFF00");
  const fontName = style.fontName || "Arial";
  const fontSize = style.fontSize || 52;

  const noOutline = style.outlineColor === "none";
  const outlineColor = noOutline ? "&H00000000&" : toASSColor(style.outlineColor || "#000000");
  const outlineSize = noOutline ? 0 : 3.5;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF&,${outlineColor},&H96000000&,-1,0,0,0,100,100,0,0,1,${outlineSize},1.5,2,80,80,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
}

function getPositionY(position) {
  switch (position) {
    case "top": return 170;
    case "center": return 960;
    default: return 1750;
  }
}

function buildDialogueLine(chunk, activeIndex, posY, style) {
  const activeWord = chunk[activeIndex];
  const start = toASSTimestamp(activeWord.start);
  const end = toASSTimestamp(activeWord.end);

  const highlightColor = toASSColor(style.highlightColor || "#FFFF00");
  const dimColor = toASSColor(style.dimColor || "#808080");

  const textParts = chunk.map((w, i) => {
    const word = w.word.trim().toUpperCase();
    return i === activeIndex
      ? `{\\c${highlightColor}}${word}`
      : `{\\c${dimColor}}${word}`;
  });

  const text = `{\\an2\\pos(540,${posY})}${textParts.join(" ")}`;
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
}

function generateASS(words, style = {}) {
  if (!words || words.length === 0) return "";

  const posY = getPositionY(style.position);
  const maxPerChunk = style.wordsPerLine || DEFAULT_MAX_PER_CHUNK;
  const chunks = chunkWords(words, maxPerChunk);
  const lines = [buildHeader(style)];

  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      lines.push(buildDialogueLine(chunk, i, posY, style));
    }
  }

  return lines.join("\n");
}

module.exports = { generateASS };

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

// Referenzauflösung: Style-Werte gelten für ein Video mit kurzer Seite 1080 px
// (gleiche Rechnung wie captionLayout() in frontend/src/captionLayout.js)
const REFERENCE_SHORT_SIDE = 1080;
const DEFAULT_VIDEO = { width: 1080, height: 1920 };

function getLayout(style, video) {
  const width = video?.width || DEFAULT_VIDEO.width;
  const height = video?.height || DEFAULT_VIDEO.height;
  const k = Math.min(width, height) / REFERENCE_SHORT_SIDE;
  return {
    width,
    height,
    fontSize: Math.round((style.fontSize || 52) * k),
    outline: style.outlineColor === "none" ? 0 : Math.round(3.5 * k * 100) / 100,
    shadow: Math.round(1.5 * k * 100) / 100,
    marginX: Math.round(80 * k),
    posX: Math.round(width / 2),
    posY: Math.round(((style.positionY ?? 91.15) / 100) * height),
  };
}

// libass findet Schriften nur über den Familiennamen, nicht über den PostScript-Namen
const ASS_FONT_NAMES = {
  "THEBOLDFONT-FREEVERSION": "THE BOLD FONT (FREE VERSION)",
};

function buildHeader(style, layout) {
  const primaryColor = toASSColor(style.highlightColor || "#FFFF00");
  const fontName = ASS_FONT_NAMES[style.fontName] || style.fontName || "Arial";
  const noOutline = style.outlineColor === "none";
  const outlineColor = noOutline ? "&H00000000&" : toASSColor(style.outlineColor || "#000000");
  const { width, height, fontSize, outline, shadow, marginX } = layout;

  // PlayRes = echte Videogröße → 1 ASS-Einheit = 1 Videopixel, keine Verzerrung bei Querformat
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF&,${outlineColor},&H96000000&,-1,0,0,0,100,100,0,0,1,${outline},${shadow},2,${marginX},${marginX},60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
}

function buildDialogueLine(chunk, activeIndex, layout, style) {
  const activeWord = chunk[activeIndex];
  const start = toASSTimestamp(activeWord.start);
  const end = toASSTimestamp(activeWord.end);

  const highlightColor = toASSColor(style.highlightColor || "#FFFF00");
  const dimColor = toASSColor(style.dimColor || "#808080");

  const textParts = chunk.map((w, i) => {
    // { } \ sind ASS-Steuerzeichen und würden als Override-Tags interpretiert
    const word = w.word.replace(/[{}\\]/g, "").trim().toUpperCase();
    return i === activeIndex
      ? `{\\c${highlightColor}}${word}`
      : `{\\c${dimColor}}${word}`;
  });

  const text = `{\\an2\\pos(${layout.posX},${layout.posY})}${textParts.join(" ")}`;
  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
}

// video: { width, height } des (rotationskorrigierten) Videos
function generateASS(words, style = {}, video = null) {
  if (!words || words.length === 0) return "";

  const layout = getLayout(style, video);
  const maxPerChunk = style.wordsPerLine || DEFAULT_MAX_PER_CHUNK;
  const chunks = chunkWords(words, maxPerChunk);
  const lines = [buildHeader(style, layout)];

  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      lines.push(buildDialogueLine(chunk, i, layout, style));
    }
  }

  return lines.join("\n");
}

module.exports = { generateASS };

// Default-Style (identisch zu DEFAULT_STYLE im Frontend)
const DEFAULT_STYLE = {
  highlightColor: "#26E200",
  dimColor: "#ffffff",
  outlineColor: "#000000",
  fontName: "THEBOLDFONT-FREEVERSION",
  fontSize: 52,
  position: "bottom",
  wordsPerLine: 5,
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FONT_RE = /^[\w\- ]{1,64}$/;
const POSITIONS = ["top", "center", "bottom"];

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// Validiert Style-Eingaben, bevor sie in die ASS-Datei interpoliert werden
function normalizeStyle(input = {}) {
  const s = { ...DEFAULT_STYLE };
  if (HEX_RE.test(input.highlightColor)) s.highlightColor = input.highlightColor;
  if (HEX_RE.test(input.dimColor)) s.dimColor = input.dimColor;
  if (input.outlineColor === "none" || HEX_RE.test(input.outlineColor)) s.outlineColor = input.outlineColor;
  if (FONT_RE.test(input.fontName || "")) s.fontName = input.fontName;
  if (POSITIONS.includes(input.position)) s.position = input.position;
  s.fontSize = clampInt(input.fontSize, 12, 200, DEFAULT_STYLE.fontSize);
  s.wordsPerLine = clampInt(input.wordsPerLine, 1, 15, DEFAULT_STYLE.wordsPerLine);
  return s;
}

module.exports = { DEFAULT_STYLE, normalizeStyle };

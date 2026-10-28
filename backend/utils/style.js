// Default-Style (identisch zu DEFAULT_STYLE im Frontend)
// fontSize: Pixel bezogen auf ein 1080p-Video (kurze Seite = 1080), wird pro Video skaliert
// positionY: Unterkante der Textzeile in % der Videohöhe
const DEFAULT_STYLE = {
  highlightColor: "#26E200",
  dimColor: "#ffffff",
  outlineColor: "#000000",
  fontName: "THEBOLDFONT-FREEVERSION",
  fontSize: 52,
  positionY: 91.15,
  wordsPerLine: 5,
};

// Alte Werte von "position" (vor positionY) → weiterhin von der API akzeptiert
const LEGACY_POSITIONS = { top: 8.85, center: 50, bottom: 91.15 };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FONT_RE = /^[\w\- ]{1,64}$/;

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function clampPercent(value, fallback) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
}

// Validiert Style-Eingaben, bevor sie in die ASS-Datei interpoliert werden
function normalizeStyle(input = {}) {
  const s = { ...DEFAULT_STYLE };
  if (HEX_RE.test(input.highlightColor)) s.highlightColor = input.highlightColor;
  if (HEX_RE.test(input.dimColor)) s.dimColor = input.dimColor;
  if (input.outlineColor === "none" || HEX_RE.test(input.outlineColor)) s.outlineColor = input.outlineColor;
  if (FONT_RE.test(input.fontName || "")) s.fontName = input.fontName;
  const legacyY = LEGACY_POSITIONS[input.position] ?? DEFAULT_STYLE.positionY;
  s.positionY = clampPercent(input.positionY, legacyY);
  s.fontSize = clampInt(input.fontSize, 12, 200, DEFAULT_STYLE.fontSize);
  s.wordsPerLine = clampInt(input.wordsPerLine, 1, 15, DEFAULT_STYLE.wordsPerLine);
  return s;
}

module.exports = { DEFAULT_STYLE, normalizeStyle };

// Spiegelt getLayout() in backend/utils/assGenerator.js → Vorschau = gerendertes Video

export const DEFAULT_VIDEO = { width: 1080, height: 1920 };
const REFERENCE_SHORT_SIDE = 1080;

// libass setzt "Fontsize" = winAscent + winDescent, CSS font-size = 1 em.
// Faktor = (winAscent + winDescent) / unitsPerEm der jeweiligen Schrift
const FONT_HEIGHT_FACTOR = {
  "THEBOLDFONT-FREEVERSION": 1.2,
  Arial: 1.117,
  Helvetica: 1.117,
  Impact: 1.22,
  Montserrat: 1.219,
};

// Gemessen gegen libass-Render: CSS-Zeile sitzt um diesen Anteil der Fontsize zu hoch
const BASELINE_SHIFT = {
  "THEBOLDFONT-FREEVERSION": 0.1,
};

export const POSITION_PRESETS = [
  { label: "Oben", value: 8.85 },
  { label: "Mitte", value: 50 },
  { label: "Unten", value: 91.15 },
];

export function captionLayout(style, video) {
  const width = video?.width || DEFAULT_VIDEO.width;
  const height = video?.height || DEFAULT_VIDEO.height;
  const k = Math.min(width, height) / REFERENCE_SHORT_SIDE;
  const fontSize = Math.round((style.fontSize || 52) * k);
  return {
    width,
    height,
    scale: k,
    fontSize,
    cssFontSize: fontSize / (FONT_HEIGHT_FACTOR[style.fontName] || 1.2),
    cssShiftY: fontSize * (BASELINE_SHIFT[style.fontName] || 0),
    outline: style.outlineColor === "none" ? 0 : Math.round(3.5 * k * 100) / 100,
    shadow: Math.round(1.5 * k * 100) / 100,
    marginX: Math.round(80 * k),
    posY: Math.round(((style.positionY ?? 91.15) / 100) * height),
  };
}

// Pixel ↔ Prozent der Videohöhe (2 Nachkommastellen reichen für exakte Pixel bis 4K)
export function pxToPercent(px, height) {
  return Math.round(Math.min(100, Math.max(0, (px / height) * 100)) * 100) / 100;
}

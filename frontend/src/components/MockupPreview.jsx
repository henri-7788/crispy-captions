import { useRef, useState, useEffect } from "react";

const EXAMPLE_WORDS = ["DIESES", "TOOL", "IST", "RICHTIG", "CRISPY"];
const ACTIVE_INDEX = 2;
const ASS_CANVAS_WIDTH = 1080;

function getOutlineStyle(outlineColor) {
  if (!outlineColor || outlineColor === "none") return "none";
  const c = outlineColor;
  return `${c} 2px 2px 0px, ${c} -2px 2px 0px, ${c} 2px -2px 0px, ${c} -2px -2px 0px`;
}

function getPositionStyle(position) {
  switch (position) {
    case "top":    return { justifyContent: "flex-start", paddingTop: "8%" };
    case "center": return { justifyContent: "center" };
    default:       return { justifyContent: "flex-end", paddingBottom: "8%" };
  }
}

export default function MockupPreview({ style, videoRatio }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const ratio = videoRatio ? videoRatio.width / videoRatio.height : 9 / 16;

  const scaledFontSize = containerWidth
    ? Math.max(Math.round((containerWidth / ASS_CANVAS_WIDTH) * (style.fontSize || 52)), 10)
    : 14;

  const fontFamily = style.fontName === "THEBOLDFONT-FREEVERSION"
    ? '"THEBOLDFONT-FREEVERSION", Impact, sans-serif'
    : `${style.fontName}, sans-serif`;

  const posStyle = getPositionStyle(style.position);
  const textShadow = getOutlineStyle(style.outlineColor);

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700 shadow-2xl"
      style={{
        aspectRatio: ratio,
        height: "100%",
        maxWidth: "100%",
        width: "auto",
      }}
    >
      {/* Hintergrund */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900" />

      {/* Rasterlinien */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "20% 20%",
        }}
      />

      {/* Film-Icon mittig */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <svg
          className="text-zinc-600"
          style={{ width: `${Math.max(scaledFontSize * 2.5, 28)}px`, opacity: 0.35 }}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V4h-4z" />
        </svg>
      </div>

      {/* Untertitel-Preview */}
      <div
        className="absolute inset-0 flex flex-col items-center px-3"
        style={posStyle}
      >
        <p
          style={{
            fontFamily,
            fontSize: `${scaledFontSize}px`,
            lineHeight: 1.25,
            textAlign: "center",
            userSelect: "none",
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          {EXAMPLE_WORDS.map((word, i) => (
            <span
              key={word}
              style={{
                color: i === ACTIVE_INDEX ? style.highlightColor : style.dimColor,
                textShadow,
              }}
            >
              {word}
              {i < EXAMPLE_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>

      {/* Ratio-Badge */}
      <div className="absolute top-2.5 right-2.5">
        <span className="text-zinc-400 text-xs bg-zinc-900/80 rounded-md px-2 py-1 font-mono backdrop-blur-sm">
          {videoRatio ? `${videoRatio.width}×${videoRatio.height}` : "9:16"}
        </span>
      </div>
    </div>
  );
}

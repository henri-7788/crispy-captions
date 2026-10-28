import { useRef, useState, useEffect } from "react";
import { captionLayout, pxToPercent } from "../captionLayout";

const EXAMPLE_WORDS = ["DIESES", "TOOL", "IST", "RICHTIG", "CRISPY"];
const ACTIVE_INDEX = 2;

function getFontFamily(fontName) {
  return fontName === "THEBOLDFONT-FREEVERSION"
    ? '"THEBOLDFONT-FREEVERSION", Impact, sans-serif'
    : `${fontName}, sans-serif`;
}

// Vorschau in echter Videogröße (W×H px), per CSS auf den verfügbaren Platz skaliert.
// Alle Maße kommen aus captionLayout() → identisch zur ASS-Datei beim Rendern.
export default function MockupPreview({ style, video, videoUrl, onPositionChange }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAvailable({ width, height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const layout = captionLayout(style, video);
  const scale = available.width && available.height
    ? Math.min(available.width / layout.width, available.height / layout.height)
    : 0;

  const hasOutline = layout.outline > 0;

  // Klick/Ziehen in der Vorschau setzt die Y-Position (Unterkante der Textzeile)
  function setYFromPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.round((e.clientY - rect.top) / scale);
    onPositionChange?.(pxToPercent(px, layout.height));
  }

  function togglePlay(e) {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 flex items-center justify-center">
      {scale > 0 && (
        <div
          className="relative rounded-2xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700 shadow-2xl cursor-ns-resize touch-none"
          style={{ width: layout.width * scale, height: layout.height * scale }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            setYFromPointer(e);
          }}
          onPointerMove={(e) => dragging && setYFromPointer(e)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* Ebene in Original-Pixeln */}
          <div
            className="absolute top-0 left-0 select-none"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={`${videoUrl}#t=0.1`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: "fill" }}
                muted
                loop
                playsInline
                preload="auto"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900" />
            )}

            {/* Hilfslinie an der aktuellen Y-Position */}
            <div
              className="absolute left-0 right-0 pointer-events-none transition-opacity"
              style={{
                top: layout.posY,
                borderTop: `${Math.max(1, 1 / scale)}px dashed rgba(250, 204, 21, 0.8)`,
                opacity: dragging ? 1 : 0,
              }}
            />

            {/* Untertitel: \an2\pos(W/2, posY) → unten-mittig verankert, Umbruch zwischen MarginL/R */}
            <p
              className="absolute pointer-events-none"
              style={{
                left: layout.marginX,
                right: layout.marginX,
                top: layout.posY + layout.cssShiftY,
                transform: "translateY(-100%)",
                margin: 0,
                textAlign: "center",
                textWrap: "balance",
                fontFamily: getFontFamily(style.fontName),
                // Die Schrift ist bereits fett; synthetischer Browser-Fettdruck wäre breiter als libass
                fontWeight: 400,
                fontSize: `${layout.cssFontSize}px`,
                lineHeight: `${layout.fontSize}px`,
                textShadow: `${layout.shadow}px ${layout.shadow}px 0 rgba(0, 0, 0, 0.41)`,
                WebkitTextStroke: hasOutline ? `${layout.outline * 2}px ${style.outlineColor}` : undefined,
                paintOrder: "stroke fill",
              }}
            >
              {EXAMPLE_WORDS.map((word, i) => (
                <span key={word} style={{ color: i === ACTIVE_INDEX ? style.highlightColor : style.dimColor }}>
                  {word}
                  {i < EXAMPLE_WORDS.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          </div>

          {/* Overlays in Bildschirmgröße (nicht skaliert) */}
          <div className="absolute top-2.5 right-2.5 pointer-events-none">
            <span className="text-zinc-300 text-xs bg-zinc-900/80 rounded-md px-2 py-1 font-mono backdrop-blur-sm">
              {layout.width}×{layout.height} · Y {layout.posY}px
            </span>
          </div>
          {videoUrl && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={togglePlay}
              className="absolute bottom-2.5 left-2.5 text-xs bg-zinc-900/80 text-zinc-200 rounded-md px-2.5 py-1 backdrop-blur-sm hover:bg-zinc-800 cursor-pointer"
            >
              {playing ? "Pause" : "Abspielen"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

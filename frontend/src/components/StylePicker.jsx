const PRESETS = {
  tiktok: { highlightColor: "#FFFF00", dimColor: "#AAAAAA", fontName: "Arial", fontSize: 52, position: "bottom" },
  reels:  { highlightColor: "#00FF88", dimColor: "#888888", fontName: "Impact", fontSize: 56, position: "bottom" },
  clean:  { highlightColor: "#FFFFFF", dimColor: "#666666", fontName: "Arial", fontSize: 48, position: "bottom" },
};

const PRESET_LABELS = {
  tiktok: { label: "TikTok", color: "bg-yellow-400 text-black" },
  reels:  { label: "Reels",  color: "bg-green-400 text-black" },
  clean:  { label: "Clean",  color: "bg-white text-black" },
};

export default function StylePicker({ style, onStyleChange, onRenderStart, transcribing }) {
  function applyPreset(key) {
    onStyleChange({ ...PRESETS[key] });
  }

  function update(key, value) {
    onStyleChange({ ...style, [key]: value });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h2 className="text-3xl font-bold text-white mb-1">Untertitel-Stil</h2>
      <p className="text-zinc-400 mb-8 text-sm">Video hochgeladen. Wähle deinen Stil.</p>

      {/* Presets */}
      <div className="flex gap-3 mb-8">
        {Object.entries(PRESET_LABELS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 ${color}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Style Controls */}
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col gap-5 mb-8">
        {/* Highlight-Farbe */}
        <div className="flex items-center justify-between">
          <label className="text-zinc-300 text-sm font-medium">Highlight-Farbe</label>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-mono">{style.highlightColor}</span>
            <input
              type="color"
              value={style.highlightColor}
              onChange={(e) => update("highlightColor", e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"
            />
          </div>
        </div>

        {/* Schriftgröße */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-zinc-300 text-sm font-medium">Schriftgröße</label>
            <span className="text-zinc-400 text-sm">{style.fontSize}px</span>
          </div>
          <input
            type="range" min="24" max="72" step="2"
            value={style.fontSize}
            onChange={(e) => update("fontSize", parseInt(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        {/* Schriftart */}
        <div className="flex items-center justify-between">
          <label className="text-zinc-300 text-sm font-medium">Schriftart</label>
          <select
            value={style.fontName}
            onChange={(e) => update("fontName", e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
          >
            <option value="Arial">Arial</option>
            <option value="Impact">Impact</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Helvetica">Helvetica</option>
          </select>
        </div>

        {/* Position */}
        <div>
          <label className="text-zinc-300 text-sm font-medium block mb-2">Position</label>
          <div className="flex gap-2">
            {["top", "center", "bottom"].map((pos) => (
              <button
                key={pos}
                onClick={() => update("position", pos)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
                  ${style.position === pos
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
              >
                {pos === "top" ? "Oben" : pos === "center" ? "Mitte" : "Unten"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onRenderStart}
        disabled={transcribing}
        className="w-full max-w-sm py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500
          text-black font-bold text-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
      >
        {transcribing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Transkribiere...
          </span>
        ) : "Untertitel generieren"}
      </button>
    </div>
  );
}

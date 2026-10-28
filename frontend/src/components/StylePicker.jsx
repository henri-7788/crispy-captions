import { useEffect, useState } from "react";
import MockupPreview from "./MockupPreview";
import { presets as presetsApi } from "../api";
import { captionLayout, pxToPercent, POSITION_PRESETS } from "../captionLayout";

const PRESETS = {
  tiktok: { highlightColor: "#FFFF00", dimColor: "#AAAAAA", outlineColor: "#000000", fontName: "THEBOLDFONT-FREEVERSION", fontSize: 52, positionY: 91.15, wordsPerLine: 5 },
  reels:  { highlightColor: "#00FF88", dimColor: "#888888", outlineColor: "#000000", fontName: "THEBOLDFONT-FREEVERSION", fontSize: 56, positionY: 91.15, wordsPerLine: 4 },
  clean:  { highlightColor: "#FFFFFF", dimColor: "#666666", outlineColor: "none",    fontName: "THEBOLDFONT-FREEVERSION", fontSize: 48, positionY: 91.15, wordsPerLine: 5 },
};

const PRESET_LABELS = {
  tiktok: { label: "TikTok", color: "bg-yellow-400 text-black" },
  reels:  { label: "Reels",  color: "bg-green-400 text-black" },
  clean:  { label: "Clean",  color: "bg-white text-black" },
};

const OUTLINE_OPTIONS = [
  { value: "#000000", label: "Schwarz" },
  { value: "#FFFFFF", label: "Weiß" },
  { value: "none",    label: "Keiner" },
];

function ColorPicker({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-zinc-300 text-sm font-medium">{label}</label>
      <div className="flex items-center gap-3">
        <span className="text-zinc-500 text-xs font-mono">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

// Eigene Presets des Users: laden, anwenden, speichern (gleicher Name überschreibt), löschen
function UserPresets({ style, onApply }) {
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    presetsApi.list()
      .then(({ data }) => setItems(data.presets))
      .catch(() => setError("Presets konnten nicht geladen werden"));
  }, []);

  async function save(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await presetsApi.save(name.trim(), style);
      setItems((prev) => [...prev.filter((p) => p.id !== data.preset.id), data.preset]);
      setName("");
      setSaving(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Speichern fehlgeschlagen");
    }
  }

  async function remove(preset) {
    if (!confirm(`Preset „${preset.name}" löschen?`)) return;
    try {
      await presetsApi.remove(preset.id);
      setItems((prev) => prev.filter((p) => p.id !== preset.id));
    } catch (err) {
      setError(err.response?.data?.error || "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="mb-6">
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Meine Presets</p>
      <div className="flex flex-wrap gap-2">
        {items.map((preset) => (
          <span key={preset.id} className="flex items-center rounded-full bg-zinc-800 text-zinc-200 text-sm overflow-hidden">
            <button onClick={() => onApply(preset.style)} className="pl-3 pr-2 py-1.5 hover:bg-zinc-700 transition-colors">
              {preset.name}
            </button>
            <button
              onClick={() => remove(preset)}
              title="Löschen"
              className="pr-3 pl-1 py-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors"
            >
              ✕
            </button>
          </span>
        ))}
        {!saving && (
          <button
            onClick={() => setSaving(true)}
            className="px-3 py-1.5 rounded-full border border-dashed border-zinc-600 text-zinc-400 text-sm hover:border-yellow-400 hover:text-yellow-400 transition-colors"
          >
            + Aktuellen Stil speichern
          </button>
        )}
      </div>
      {saving && (
        <form onSubmit={save} className="flex gap-2 mt-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name, z. B. Podcast"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
          />
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-sm font-medium hover:bg-yellow-300">
            Speichern
          </button>
          <button type="button" onClick={() => { setSaving(false); setName(""); }} className="px-2 text-zinc-500 hover:text-zinc-300 text-sm">
            Abbrechen
          </button>
        </form>
      )}
      {saving && items.some((p) => p.name === name.trim()) && (
        <p className="text-zinc-500 text-xs mt-1">Ein Preset mit diesem Namen wird überschrieben.</p>
      )}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}

export default function StylePicker({ style, onStyleChange, onRenderStart, transcribing, video, videoUrl }) {
  const layout = captionLayout(style, video);
  // Freie Eingabe im Pixel-Feld, ohne dass ein leeres/halbes Feld sofort zurückspringt
  const [yDraft, setYDraft] = useState(null);

  function applyPreset(key) {
    onStyleChange({ ...PRESETS[key] });
  }

  function update(key, value) {
    onStyleChange({ ...style, [key]: value });
  }

  function setYPixels(px) {
    update("positionY", pxToPercent(px, layout.height));
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="flex gap-10 items-stretch w-full max-w-5xl">

        {/* Linke Spalte: Einstellungen */}
        <div className="flex flex-col w-80 flex-shrink-0">
          <h2 className="text-3xl font-bold text-white mb-1">Untertitel-Stil</h2>
          <p className="text-zinc-400 mb-6 text-sm">Video hochgeladen. Wähle deinen Stil.</p>

          {/* Presets */}
          <div className="flex gap-2 mb-4">
            {Object.entries(PRESET_LABELS).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`flex-1 py-2 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 ${color}`}
              >
                {label}
              </button>
            ))}
          </div>

          <UserPresets style={style} onApply={(preset) => onStyleChange({ ...preset })} />

          {/* Einstellungs-Panel */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col gap-4 mb-5">

            <p className="text-zinc-500 text-xs uppercase tracking-widest">Farben</p>

            <ColorPicker
              label="Highlight"
              value={style.highlightColor}
              onChange={(v) => update("highlightColor", v)}
            />
            <ColorPicker
              label="Inaktive Wörter"
              value={style.dimColor}
              onChange={(v) => update("dimColor", v)}
            />

            {/* Kontur */}
            <div>
              <label className="text-zinc-300 text-sm font-medium block mb-2">Kontur</label>
              <div className="flex gap-2">
                {OUTLINE_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update("outlineColor", value)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${style.outlineColor === value
                        ? "bg-yellow-400 text-black"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex flex-col gap-4">
              <p className="text-zinc-500 text-xs uppercase tracking-widest">Text</p>

              {/* Schriftart */}
              <div className="flex items-center justify-between">
                <label className="text-zinc-300 text-sm font-medium">Schriftart</label>
                <select
                  value={style.fontName}
                  onChange={(e) => update("fontName", e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5"
                >
                  <option value="THEBOLDFONT-FREEVERSION">THE BOLD FONT</option>
                  <option value="Arial">Arial</option>
                  <option value="Impact">Impact</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>

              {/* Schriftgröße */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-zinc-300 text-sm font-medium">Schriftgröße</label>
                  <span className="text-zinc-400 text-sm">
                    {style.fontSize}px
                    {layout.scale !== 1 && <span className="text-zinc-600"> · {layout.fontSize}px im Video</span>}
                  </span>
                </div>
                <input
                  type="range" min="24" max="80" step="2"
                  value={style.fontSize}
                  onChange={(e) => update("fontSize", parseInt(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>

              {/* Wörter pro Zeile */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-zinc-300 text-sm font-medium">Wörter pro Zeile</label>
                  <span className="text-zinc-400 text-sm">{style.wordsPerLine}</span>
                </div>
                <input
                  type="range" min="2" max="7" step="1"
                  value={style.wordsPerLine}
                  onChange={(e) => update("wordsPerLine", parseInt(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex flex-col gap-3">
              <p className="text-zinc-500 text-xs uppercase tracking-widest">Position</p>
              <div className="flex gap-2">
                {POSITION_PRESETS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => update("positionY", value)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${style.positionY === value
                        ? "bg-yellow-400 text-black"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Exakte Y-Position: Unterkante der Textzeile in Videopixeln */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="position-y" className="text-zinc-300 text-sm font-medium">Y-Position</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="position-y"
                      type="number"
                      min="0"
                      max={layout.height}
                      step="1"
                      value={yDraft ?? layout.posY}
                      onChange={(e) => {
                        setYDraft(e.target.value);
                        const px = parseInt(e.target.value, 10);
                        if (Number.isFinite(px)) setYPixels(px);
                      }}
                      onBlur={() => setYDraft(null)}
                      className="w-20 bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-2 py-1 text-right font-mono"
                    />
                    <span className="text-zinc-500 text-sm">/ {layout.height}px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max={layout.height}
                  step="1"
                  value={layout.posY}
                  onChange={(e) => setYPixels(parseInt(e.target.value, 10))}
                  className="w-full accent-yellow-400"
                />
                <p className="text-zinc-600 text-xs mt-1">
                  {style.positionY}% von oben · Unterkante der Zeile. Du kannst den Text auch in der Vorschau ziehen.
                </p>
              </div>
            </div>
          </div>

          {/* Render-Button */}
          <button
            onClick={onRenderStart}
            disabled={transcribing}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-700 disabled:text-zinc-500
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

        {/* Rechte Spalte: Vorschau in Videopixeln — gleiche Höhe wie Einstellungsbox */}
        <div className="flex-1 relative min-w-0 min-h-[480px]">
          <MockupPreview
            style={style}
            video={video}
            videoUrl={videoUrl}
            onPositionChange={(positionY) => update("positionY", positionY)}
          />
        </div>

      </div>
    </div>
  );
}

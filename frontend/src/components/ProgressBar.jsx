import { useEffect, useState } from "react";
import { startRender } from "../api";

const STEPS = ["Upload", "Stil", "Render", "Fertig"];

export default function ProgressBar({ jobId, filename, words, style, onComplete, onError }) {
  const [percent, setPercent] = useState(0);
  const [stepLabel, setStepLabel] = useState("Rendering...");

  useEffect(() => {
    startRender(jobId, filename, words, style, (event) => {
      if (event.type === "progress") {
        setPercent(event.percent || 0);
        if (event.step) setStepLabel(event.step);
      } else if (event.type === "done") {
        setPercent(100);
        onComplete(event.downloadUrl);
      } else if (event.type === "error") {
        onError(event.message);
      }
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Schritt-Indikatoren */}
      <div className="flex items-center gap-2 mb-12">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
              ${i < 2 ? "bg-yellow-400 text-black" : i === 2 ? "bg-yellow-400 text-black animate-pulse" : "bg-zinc-800 text-zinc-600"}`}>
              {i < 2 ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i === 2 ? "text-zinc-300" : i < 2 ? "text-zinc-400" : "text-zinc-700"}`}>{step}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < 2 ? "bg-yellow-400" : "bg-zinc-800"}`} />}
          </div>
        ))}
      </div>

      {/* Spinner + Label */}
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="w-16 h-16 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
        <p className="text-zinc-300 font-medium">{stepLabel}</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>Fortschritt</span>
          <span>{percent}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2.5">
          <div
            className="bg-yellow-400 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-zinc-600 text-xs text-center mt-4">Das kann je nach Videolänge etwas dauern...</p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { transcribeVideo } from "./api";
import UploadArea from "./components/UploadArea";
import StylePicker from "./components/StylePicker";
import ProgressBar from "./components/ProgressBar";
import DownloadButton from "./components/DownloadButton";

const DEFAULT_STYLE = {
  highlightColor: "#FFFF00",
  dimColor: "#AAAAAA",
  fontName: "THEBOLDFONT-FREEVERSION",
  fontSize: 52,
  position: "bottom",
};

export default function App() {
  const [step, setStep] = useState("upload");
  const [jobId, setJobId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [words, setWords] = useState([]);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState(null);

  function handleUploadComplete({ jobId, filename }) {
    setJobId(jobId);
    setFilename(filename);
    setStep("styling");
  }

  async function handleRenderStart() {
    setTranscribing(true);
    setError(null);
    try {
      const { data } = await transcribeVideo(jobId, filename);
      setWords(data.words);
      setStep("rendering");
    } catch (err) {
      setError(err.response?.data?.error || "Transkription fehlgeschlagen");
    } finally {
      setTranscribing(false);
    }
  }

  function handleRenderComplete() {
    setStep("done");
  }

  function handleError(message) {
    setError(message);
    setStep("styling");
  }

  function reset() {
    setStep("upload");
    setJobId(null);
    setFilename(null);
    setWords([]);
    setStyle(DEFAULT_STYLE);
    setError(null);
    setTranscribing(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {error && step !== "upload" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-950/90 border border-red-800 text-red-300 rounded-xl px-5 py-3 text-sm flex items-center gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 font-bold">✕</button>
          </div>
        </div>
      )}

      {step === "upload" && (
        <UploadArea onUploadComplete={handleUploadComplete} />
      )}
      {step === "styling" && (
        <StylePicker
          style={style}
          onStyleChange={setStyle}
          onRenderStart={handleRenderStart}
          transcribing={transcribing}
        />
      )}
      {step === "rendering" && (
        <ProgressBar
          jobId={jobId}
          filename={filename}
          words={words}
          style={style}
          onComplete={handleRenderComplete}
          onError={handleError}
        />
      )}
      {step === "done" && (
        <DownloadButton jobId={jobId} onReset={reset} />
      )}
    </div>
  );
}

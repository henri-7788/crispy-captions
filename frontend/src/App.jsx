import { useState } from "react";
import { transcribeVideo } from "./api";
import UploadArea from "./components/UploadArea";
import StylePicker from "./components/StylePicker";
import ProgressBar from "./components/ProgressBar";
import DownloadButton from "./components/DownloadButton";
import LoginPage from "./components/LoginPage";
import AdminPanel from "./components/AdminPanel";
import { useAuth } from "./auth";

const DEFAULT_STYLE = {
  highlightColor: "#26E200",
  dimColor: "#ffffff",
  outlineColor: "#000000",
  fontName: "THEBOLDFONT-FREEVERSION",
  fontSize: 52,
  position: "bottom",
  wordsPerLine: 5,
};

export default function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState("app");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="fixed top-4 right-4 z-40 flex items-center gap-3 text-sm">
        <span className="text-zinc-500 hidden sm:inline">{user.email}</span>
        {user.role === "admin" && (
          <button
            onClick={() => setView(view === "admin" ? "app" : "admin")}
            className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {view === "admin" ? "Zurück" : "Admin"}
          </button>
        )}
        <button
          onClick={() => { setView("app"); logout(); }}
          className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Abmelden
        </button>
      </header>

      {view === "admin" && user.role === "admin" ? <AdminPanel /> : <CaptionFlow />}
    </div>
  );
}

function CaptionFlow() {
  const [step, setStep] = useState("upload");
  const [jobId, setJobId] = useState(null);
  const [filename, setFilename] = useState(null);
  const [videoRatio, setVideoRatio] = useState(null);
  const [words, setWords] = useState([]);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState(null);

  function handleUploadComplete({ jobId, filename, videoRatio }) {
    setJobId(jobId);
    setFilename(filename);
    setVideoRatio(videoRatio);
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
    setVideoRatio(null);
    setWords([]);
    setStyle(DEFAULT_STYLE);
    setError(null);
    setTranscribing(false);
  }

  return (
    <div>
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
          videoRatio={videoRatio}
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

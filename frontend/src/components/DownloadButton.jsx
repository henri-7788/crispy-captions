import { getDownloadUrl } from "../api";

export default function DownloadButton({ jobId, onReset }) {
  const url = getDownloadUrl(jobId);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Erfolgs-Icon */}
      <div className="w-20 h-20 rounded-full bg-yellow-400/10 border-2 border-yellow-400 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-white mb-2">Fertig!</h2>
      <p className="text-zinc-400 mb-10 text-sm">Dein Video mit animierten Untertiteln ist bereit.</p>

      <a
        href={url}
        download="crispy_captions_output.mp4"
        className="w-full max-w-sm py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg rounded-2xl
          transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Video herunterladen
      </a>

      <button
        onClick={onReset}
        className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors underline underline-offset-4"
      >
        Neues Video erstellen
      </button>
    </div>
  );
}

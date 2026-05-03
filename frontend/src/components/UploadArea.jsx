import { useState, useRef } from "react";
import { uploadVideo } from "../api";

export default function UploadArea({ onUploadComplete }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const ALLOWED_TYPES = ["video/mp4", "video/quicktime"];
  const MAX_MB = 500;

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Nur MP4 und MOV Dateien erlaubt";
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `Datei zu groß (max. ${MAX_MB} MB)`;
    }
    return null;
  }

  async function handleFile(file) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const { data } = await uploadVideo(file, setUploadProgress);
      onUploadComplete(data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">crispy captions</h1>
      <p className="text-zinc-400 mb-10 text-base">Animierte Untertitel im TikTok-Stil — automatisch</p>

      <div
        className={`relative w-full max-w-lg rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer transition-all duration-200
          ${dragOver ? "border-yellow-400 bg-zinc-800" : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime"
          className="hidden"
          onChange={onInputChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-300 text-sm">Uploading... {uploadProgress}%</p>
            <div className="w-full bg-zinc-700 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-zinc-300 font-medium">Video hier ablegen</p>
            <p className="text-zinc-500 text-sm">oder klicken zum Auswählen</p>
            <p className="text-zinc-600 text-xs mt-2">MP4, MOV · max. 500 MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

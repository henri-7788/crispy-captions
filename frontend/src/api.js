import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function uploadVideo(file, onProgress) {
  const form = new FormData();
  form.append("video", file);
  return axios.post(`${BASE}/api/upload`, form, {
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
}

export function transcribeVideo(jobId, filename) {
  return axios.post(`${BASE}/api/transcribe`, { jobId, filename });
}

export function startRender(jobId, filename, words, style, onEvent) {
  // SSE via POST (fetch + ReadableStream, da EventSource nur GET unterstützt)
  fetch(`${BASE}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, filename, words, style }),
  }).then((response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch {
              // ignore parse errors
            }
          }
        }
        pump();
      });
    }
    pump();
  });
}

export function getDownloadUrl(jobId) {
  return `${BASE}/api/download/${jobId}`;
}

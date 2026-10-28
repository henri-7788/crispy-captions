import axios from "axios";

// Leer = relative URLs (Production: gleiches Origin). Lokal: http://localhost:3001
const BASE = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "cc_token";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

// Wird vom AuthProvider gesetzt → bei 401 automatisch ausloggen
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

axios.interceptors.request.use((config) => {
  Object.assign(config.headers, authHeaders());
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/api/auth/login") && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----

export function login(email, password) {
  return axios.post(`${BASE}/api/auth/login`, { email, password });
}

export function register(email, password, inviteCode) {
  return axios.post(`${BASE}/api/auth/register`, { email, password, inviteCode });
}

export function fetchMe() {
  return axios.get(`${BASE}/api/auth/me`);
}

// ---- Admin ----

export const admin = {
  listInvites: () => axios.get(`${BASE}/api/admin/invites`),
  createInvite: (expiresInDays, note) => axios.post(`${BASE}/api/admin/invites`, { expiresInDays, note }),
  deleteInvite: (code) => axios.delete(`${BASE}/api/admin/invites/${encodeURIComponent(code)}`),
  listUsers: () => axios.get(`${BASE}/api/admin/users`),
  updateUser: (id, fields) => axios.patch(`${BASE}/api/admin/users/${id}`, fields),
  deleteUser: (id) => axios.delete(`${BASE}/api/admin/users/${id}`),
};

// ---- Video-Flow ----

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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ jobId, filename, words, style }),
  }).then(async (response) => {
    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) onUnauthorized();
      const data = await response.json().catch(() => ({}));
      onEvent({ type: "error", message: data.error || `Render fehlgeschlagen (${response.status})` });
      return;
    }

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

// Download per authentifiziertem Request (ein normaler Link hätte keinen Token)
export async function downloadVideo(jobId) {
  const { data } = await axios.get(`${BASE}/api/download/${jobId}`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "crispy_captions_output.mp4";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Presets (pro User) ----

export const presets = {
  list: () => axios.get(`${BASE}/api/presets`),
  save: (name, style) => axios.post(`${BASE}/api/presets`, { name, style }),
  remove: (id) => axios.delete(`${BASE}/api/presets/${id}`),
};

// ---- API-Keys (für /api/v1) ----

export const apiKeys = {
  list: () => axios.get(`${BASE}/api/keys`),
  create: (name) => axios.post(`${BASE}/api/keys`, { name }),
  revoke: (id) => axios.delete(`${BASE}/api/keys/${id}`),
};

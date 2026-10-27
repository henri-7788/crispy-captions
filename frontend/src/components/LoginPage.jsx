import { useState } from "react";
import { useAuth } from "../auth";

function getInviteFromUrl() {
  return new URLSearchParams(window.location.search).get("invite") || "";
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const [inviteCode, setInviteCode] = useState(getInviteFromUrl);
  const [mode, setMode] = useState(() => (getInviteFromUrl() ? "register" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, inviteCode);
        // Invite-Parameter aus der URL entfernen
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-yellow-400 focus:ring-0";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">crispy captions</h1>
      <p className="text-zinc-400 mb-10 text-base">Animierte Untertitel im TikTok-Stil — automatisch</p>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <div className="flex gap-2 mb-6">
          {[["login", "Anmelden"], ["register", "Registrieren"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setError(null); }}
              className={`flex-1 py-2 rounded-full font-bold text-sm transition-colors
                ${mode === key ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "register" ? "Passwort (min. 8 Zeichen)" : "Passwort"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === "register" && (
            <input
              type="text"
              required
              placeholder="Invite-Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono tracking-widest`}
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-bold rounded-xl transition-colors"
          >
            {busy ? "..." : mode === "login" ? "Anmelden" : "Account erstellen"}
          </button>
        </form>

        {mode === "register" && (
          <p className="text-zinc-600 text-xs text-center mt-4">Registrierung nur mit Einladung eines Admins.</p>
        )}
      </div>
    </div>
  );
}

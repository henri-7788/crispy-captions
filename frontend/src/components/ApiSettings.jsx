import { useCallback, useEffect, useState } from "react";
import { apiKeys, presets as presetsApi } from "../api";
import { formatDate } from "../format";

const KEY_PLACEHOLDER = "DEIN_API_KEY";

function CopyButton({ text, label = "Kopieren" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Kopieren:", text);
    }
  }

  return (
    <button onClick={copy} className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white whitespace-nowrap">
      {copied ? "Kopiert ✓" : label}
    </button>
  );
}

function CodeBlock({ title, code }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-zinc-400 text-xs">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs text-zinc-200 font-mono overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function Section({ step, title, description, children }) {
  return (
    <section className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {step && (
          <span className="w-7 h-7 flex-shrink-0 rounded-full bg-yellow-400 text-black text-xs font-bold flex items-center justify-center">
            {step}
          </span>
        )}
        <div>
          <h3 className="text-white font-bold">{title}</h3>
          {description && <p className="text-zinc-400 text-sm mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function KeysSection({ newKey, onCreated, onError }) {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState("");

  const load = useCallback(() => {
    apiKeys.list()
      .then(({ data }) => setKeys(data.keys))
      .catch((err) => onError(err.response?.data?.error || "API-Keys konnten nicht geladen werden"));
  }, [onError]);

  useEffect(load, [load]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await apiKeys.create(name.trim());
      onCreated(data.key);
      setName("");
      load();
    } catch (err) {
      onError(err.response?.data?.error || "API-Key konnte nicht erstellt werden");
    }
  }

  async function revoke(key) {
    if (!confirm(`API-Key „${key.name}" widerrufen? Skripte, die ihn nutzen, funktionieren danach nicht mehr.`)) return;
    try {
      await apiKeys.revoke(key.id);
      load();
    } catch (err) {
      onError(err.response?.data?.error || "API-Key konnte nicht widerrufen werden");
    }
  }

  return (
    <Section
      step="1"
      title="API-Key erstellen"
      description="Ein Key pro Anwendung (z. B. „n8n“, „Upload-Skript“), dann kannst du einzelne gezielt widerrufen."
    >
      <form onSubmit={create} className="flex flex-wrap gap-3">
        <input
          type="text"
          maxLength={40}
          placeholder="Name, z. B. n8n"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm">
          Key erstellen
        </button>
      </form>

      {newKey && (
        <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4 flex flex-col gap-2">
          <p className="text-yellow-300 text-sm font-medium">
            Dein neuer API-Key. Kopiere ihn jetzt, er wird aus Sicherheitsgründen nur einmal angezeigt.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 min-w-0 break-all font-mono text-sm text-white bg-zinc-950 rounded-lg px-3 py-2">{newKey}</code>
            <CopyButton text={newKey} />
          </div>
          <p className="text-zinc-400 text-xs">Die Beispiele unten verwenden diesen Key bereits.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-500 text-xs uppercase tracking-widest">
            <tr className="border-b border-zinc-800">
              <th className="text-left py-2 pr-4">Name</th>
              <th className="text-left py-2 pr-4">Key</th>
              <th className="text-left py-2 pr-4">Erstellt</th>
              <th className="text-left py-2 pr-4">Zuletzt benutzt</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr><td colSpan={5} className="py-5 text-center text-zinc-600">Noch keine API-Keys</td></tr>
            )}
            {keys.map((key) => (
              <tr key={key.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="py-3 pr-4 text-zinc-100">{key.name}</td>
                <td className="py-3 pr-4 font-mono text-zinc-400">{key.prefix}…</td>
                <td className="py-3 pr-4 text-zinc-400">{formatDate(key.createdAt)}</td>
                <td className="py-3 pr-4 text-zinc-400">{key.lastUsedAt ? formatDate(key.lastUsedAt) : "nie"}</td>
                <td className="py-3 text-right">
                  <button onClick={() => revoke(key)} className="text-red-400 hover:text-red-300">Widerrufen</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export default function ApiSettings() {
  const [error, setError] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    presetsApi.list()
      .then(({ data }) => setPresets(data.presets))
      .catch(() => setError("Presets konnten nicht geladen werden"));
  }, []);

  const base = window.location.origin;
  const key = newKey || KEY_PLACEHOLDER;
  const auth = `-H "Authorization: Bearer ${key}"`;
  const presetArg = presetName ? ` \\\n  -F ${shellQuote(`preset=${presetName}`)}` : "";

  const startJob = `curl -X POST ${base}/api/v1/jobs \\
  ${auth} \\
  -F "video=@clip.mp4"${presetArg}`;
  const checkStatus = `curl ${base}/api/v1/jobs/JOB_ID \\
  ${auth}`;
  const download = `curl -o ergebnis.mp4 ${base}/api/v1/jobs/JOB_ID/download \\
  ${auth}`;
  const listPresets = `curl ${base}/api/v1/presets \\
  ${auth}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-10 flex flex-col gap-5">
      <div>
        <h2 className="text-3xl font-bold text-white mb-1">API</h2>
        <p className="text-zinc-400 text-sm">
          Videos automatisch untertiteln, z. B. aus n8n, Make, Zapier oder einem eigenen Skript.
          Es gelten dieselben Limits und Presets wie im Editor.
        </p>
      </div>

      {error && (
        <div className="bg-red-950/90 border border-red-800 text-red-300 rounded-xl px-5 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 font-bold">✕</button>
        </div>
      )}

      <KeysSection newKey={newKey} onCreated={setNewKey} onError={setError} />

      <Section
        step="2"
        title="Preset wählen (optional)"
        description="Deine im Editor gespeicherten Presets. Ohne Preset wird der Standard-Stil verwendet."
      >
        {presets.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            Noch keine Presets. Speichere im Editor einen Stil mit „+ Aktuellen Stil speichern“.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[{ id: "", name: "" }, ...presets].map((p) => (
              <button
                key={p.id || "none"}
                onClick={() => setPresetName(p.name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors
                  ${presetName === p.name ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
              >
                {p.style && (
                  <span className="flex">
                    <span className="w-3 h-3 rounded-full ring-1 ring-black/40" style={{ background: p.style.highlightColor }} />
                    <span className="w-3 h-3 rounded-full ring-1 ring-black/40 -ml-1" style={{ background: p.style.dimColor }} />
                  </span>
                )}
                {p.name || "Standard"}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section
        step="3"
        title="Video verarbeiten"
        description="Upload starten, Status abfragen bis „done“, dann herunterladen. Die Verarbeitung läuft im Hintergrund."
      >
        <CodeBlock title="Job starten → Antwort enthält die jobId" code={startJob} />
        <CodeBlock title="Status abfragen (queued → transcribing → rendering → done)" code={checkStatus} />
        <CodeBlock title="Ergebnis herunterladen (einmalig, danach gelöscht)" code={download} />
        {!newKey && (
          <p className="text-zinc-500 text-xs">
            Ersetze <code className="font-mono text-zinc-300">{KEY_PLACEHOLDER}</code> durch deinen Key
            und <code className="font-mono text-zinc-300">JOB_ID</code> durch die jobId aus der ersten Antwort.
          </p>
        )}
      </Section>

      <Section title="In n8n, Make oder Zapier">
        <ul className="text-sm text-zinc-300 flex flex-col gap-2 list-disc pl-5">
          <li>HTTP-Request-Node, Methode <b>POST</b>, URL <code className="font-mono text-zinc-100">{base}/api/v1/jobs</code></li>
          <li>Header <code className="font-mono text-zinc-100">Authorization</code> = <code className="font-mono text-zinc-100">Bearer {newKey ? "<dein Key>" : KEY_PLACEHOLDER}</code></li>
          <li>Body <b>Form-Data (multipart)</b>: Feld <code className="font-mono text-zinc-100">video</code> als Datei (Binary), optional Feld <code className="font-mono text-zinc-100">preset</code>{presetName && <> = <code className="font-mono text-zinc-100">{presetName}</code></>}</li>
          <li>Danach in einer Schleife <code className="font-mono text-zinc-100">GET /api/v1/jobs/&#123;jobId&#125;</code> abfragen (z. B. alle 15 s), bis <code className="font-mono text-zinc-100">status</code> = <code className="font-mono text-zinc-100">done</code>, dann <code className="font-mono text-zinc-100">downloadUrl</code> als Datei laden.</li>
        </ul>
      </Section>

      <Section title="Referenz">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="text-zinc-300">
              {[
                ["POST", "/api/v1/jobs", "multipart: video (MP4/MOV), optional preset (Name) und style (JSON, überschreibt einzelne Felder)"],
                ["GET", "/api/v1/jobs/:id", "status, progress, error, downloadUrl"],
                ["GET", "/api/v1/jobs/:id/download", "fertiges MP4 (einmalig)"],
                ["GET", "/api/v1/jobs", "deine letzten 100 Jobs"],
                ["GET", "/api/v1/presets", "deine gespeicherten Presets"],
              ].map(([method, path, desc]) => (
                <tr key={path + method} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-yellow-400 text-xs">{method}</td>
                  <td className="py-2 pr-4 font-mono text-zinc-100 text-xs whitespace-nowrap">{path}</td>
                  <td className="py-2 text-zinc-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock title="Presets per API abrufen" code={listPresets} />
        <p className="text-zinc-500 text-xs">
          style-Felder: highlightColor, dimColor (#RRGGBB), outlineColor (#RRGGBB oder none), fontName,
          fontSize (12–200), positionY (0–100 % der Videohöhe), wordsPerLine (1–15).
          Beispiel: <code className="font-mono text-zinc-300">-F {shellQuote('style={"positionY":80}')}</code>
        </p>
      </Section>
    </div>
  );
}

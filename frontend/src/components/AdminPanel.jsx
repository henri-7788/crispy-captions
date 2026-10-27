import { useCallback, useEffect, useState } from "react";
import { admin } from "../api";
import { useAuth } from "../auth";

function formatDate(value) {
  if (!value) return "—";
  // SQLite liefert "YYYY-MM-DD HH:MM:SS" in UTC
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

function inviteStatus(invite) {
  if (invite.usedAt) return { label: `benutzt von ${invite.usedBy || "gelöschtem User"}`, className: "text-zinc-500" };
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { label: "abgelaufen", className: "text-red-400" };
  return { label: "offen", className: "text-yellow-400" };
}

function InvitesTab({ onError }) {
  const [invites, setInvites] = useState([]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(null);

  const load = useCallback(() => {
    admin.listInvites()
      .then(({ data }) => setInvites(data.invites))
      .catch((err) => onError(err.response?.data?.error || "Invites konnten nicht geladen werden"));
  }, [onError]);

  useEffect(load, [load]);

  async function create(e) {
    e.preventDefault();
    try {
      await admin.createInvite(Number(expiresInDays) || 0, note.trim() || undefined);
      setNote("");
      load();
    } catch (err) {
      onError(err.response?.data?.error || "Invite konnte nicht erstellt werden");
    }
  }

  async function remove(code) {
    try {
      await admin.deleteInvite(code);
      load();
    } catch (err) {
      onError(err.response?.data?.error || "Invite konnte nicht gelöscht werden");
    }
  }

  async function copyLink(code) {
    const link = `${window.location.origin}/?invite=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Einladungslink kopieren:", link);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={create} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-2 text-sm text-zinc-300">
          Gültig (Tage, 0 = unbegrenzt)
          <input
            type="number"
            min={0}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="w-40 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-zinc-300 flex-1 min-w-48">
          Notiz (optional)
          <input
            type="text"
            maxLength={200}
            placeholder="z. B. für wen"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg text-sm">
          Code erstellen
        </button>
      </form>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-500 text-xs uppercase tracking-widest">
            <tr className="border-b border-zinc-800">
              <th className="text-left p-4">Code</th>
              <th className="text-left p-4">Notiz</th>
              <th className="text-left p-4">Erstellt</th>
              <th className="text-left p-4">Läuft ab</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-zinc-600">Noch keine Invite-Codes</td></tr>
            )}
            {invites.map((inv) => {
              const status = inviteStatus(inv);
              const open = status.label === "offen";
              return (
                <tr key={inv.code} className="border-b border-zinc-800/60 last:border-0">
                  <td className="p-4 font-mono text-zinc-100 tracking-widest">{inv.code}</td>
                  <td className="p-4 text-zinc-400">{inv.note || "—"}</td>
                  <td className="p-4 text-zinc-400">{formatDate(inv.createdAt)}</td>
                  <td className="p-4 text-zinc-400">{inv.expiresAt ? formatDate(inv.expiresAt) : "nie"}</td>
                  <td className={`p-4 ${status.className}`}>{status.label}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {open && (
                      <button onClick={() => copyLink(inv.code)} className="text-zinc-300 hover:text-white mr-4">
                        {copied === inv.code ? "Kopiert ✓" : "Link kopieren"}
                      </button>
                    )}
                    {!inv.usedAt && (
                      <button onClick={() => remove(inv.code)} className="text-red-400 hover:text-red-300">Löschen</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ onError }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);

  const load = useCallback(() => {
    admin.listUsers()
      .then(({ data }) => setUsers(data.users))
      .catch((err) => onError(err.response?.data?.error || "User konnten nicht geladen werden"));
  }, [onError]);

  useEffect(load, [load]);

  async function update(id, fields) {
    try {
      await admin.updateUser(id, fields);
      load();
    } catch (err) {
      onError(err.response?.data?.error || "Änderung fehlgeschlagen");
    }
  }

  async function resetPassword(u) {
    const password = window.prompt(`Neues Passwort für ${u.email} (min. 8 Zeichen):`);
    if (password) await update(u.id, { password });
  }

  async function remove(u) {
    if (!window.confirm(`${u.email} wirklich löschen? Alle Jobs des Users werden ebenfalls entfernt.`)) return;
    try {
      await admin.deleteUser(u.id);
      load();
    } catch (err) {
      onError(err.response?.data?.error || "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-zinc-500 text-xs uppercase tracking-widest">
          <tr className="border-b border-zinc-800">
            <th className="text-left p-4">E-Mail</th>
            <th className="text-left p-4">Rolle</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Jobs</th>
            <th className="text-left p-4">Registriert</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isMe = u.id === me.id;
            return (
              <tr key={u.id} className="border-b border-zinc-800/60 last:border-0">
                <td className="p-4 text-zinc-100">{u.email}{isMe && <span className="text-zinc-500"> (du)</span>}</td>
                <td className="p-4">
                  <select
                    value={u.role}
                    disabled={isMe}
                    onChange={(e) => update(u.id, { role: e.target.value })}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-1.5 disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className={`p-4 ${u.disabled ? "text-red-400" : "text-zinc-400"}`}>{u.disabled ? "gesperrt" : "aktiv"}</td>
                <td className="p-4 text-zinc-400">{u.jobCount}</td>
                <td className="p-4 text-zinc-400">{formatDate(u.createdAt)}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button onClick={() => resetPassword(u)} className="text-zinc-300 hover:text-white mr-4">Passwort</button>
                  {!isMe && (
                    <>
                      <button onClick={() => update(u.id, { disabled: !u.disabled })} className="text-zinc-300 hover:text-white mr-4">
                        {u.disabled ? "Entsperren" : "Sperren"}
                      </button>
                      <button onClick={() => remove(u)} className="text-red-400 hover:text-red-300">Löschen</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState("invites");
  const [error, setError] = useState(null);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-10">
      <h2 className="text-3xl font-bold text-white mb-1">Admin</h2>
      <p className="text-zinc-400 mb-6 text-sm">Invite-Codes erstellen und User verwalten.</p>

      <div className="flex gap-2 mb-6">
        {[["invites", "Invite-Codes"], ["users", "User"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setError(null); }}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-colors
              ${tab === key ? "bg-yellow-400 text-black" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-950/90 border border-red-800 text-red-300 rounded-xl px-5 py-3 text-sm flex items-center justify-between mb-5">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 font-bold">✕</button>
        </div>
      )}

      {tab === "invites" ? <InvitesTab onError={setError} /> : <UsersTab onError={setError} />}
    </div>
  );
}

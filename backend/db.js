const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "crispy.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    disabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invite_codes (
    code TEXT PRIMARY KEY,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_at TEXT,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    source TEXT NOT NULL DEFAULT 'web',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS usage_user_time ON usage (user_id, kind, created_at);

  CREATE TABLE IF NOT EXISTS presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    style TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, name)
  );

  -- Persönliche API-Keys für /api/v1; gespeichert wird nur der SHA-256-Hash
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
  );
`);

// Dateien werden beim Start ohnehin gelöscht → laufende Jobs sind verloren
db.prepare(
  "UPDATE jobs SET status = 'error', error = 'Server-Neustart' WHERE status IN ('uploaded', 'queued', 'transcribing', 'rendering')"
).run();

// Ersten Admin aus Env anlegen, falls noch keiner existiert
function bootstrapAdmin() {
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
  if (hasAdmin) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("Kein Admin vorhanden. ADMIN_EMAIL und ADMIN_PASSWORD setzen, um einen anzulegen.");
    return;
  }
  // Bestehende User nie verändern (kein Passwort-Überschreiben per Env)
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(ADMIN_EMAIL.trim())) {
    console.warn(`Kein Admin vorhanden, aber ${ADMIN_EMAIL} existiert bereits als User. Wird nicht verändert.`);
    return;
  }
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')").run(ADMIN_EMAIL.trim(), hash);
  console.log(`Admin ${ADMIN_EMAIL} angelegt.`);
}
bootstrapAdmin();

function publicUser(u) {
  return { id: u.id, email: u.email, role: u.role, disabled: !!u.disabled, createdAt: u.created_at };
}

module.exports = { db, publicUser };

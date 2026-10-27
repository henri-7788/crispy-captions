const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { db, publicUser } = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 10) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// ---- Invite-Codes ----

router.get("/invites", (_req, res) => {
  const invites = db.prepare(`
    SELECT i.*, c.email AS created_by_email, u.email AS used_by_email
    FROM invite_codes i
    LEFT JOIN users c ON c.id = i.created_by
    LEFT JOIN users u ON u.id = i.used_by
    ORDER BY i.created_at DESC
  `).all();
  res.json({
    invites: invites.map((i) => ({
      code: i.code,
      note: i.note,
      createdAt: i.created_at,
      createdBy: i.created_by_email,
      expiresAt: i.expires_at,
      usedAt: i.used_at,
      usedBy: i.used_by_email,
    })),
  });
});

router.post("/invites", (req, res) => {
  const { expiresInDays, note } = req.body || {};
  const days = Number(expiresInDays);
  const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
  const code = generateCode();
  db.prepare("INSERT INTO invite_codes (code, created_by, expires_at, note) VALUES (?, ?, ?, ?)")
    .run(code, req.user.id, expiresAt, note ? String(note).slice(0, 200) : null);
  res.status(201).json({ code, expiresAt, note: note || null });
});

router.delete("/invites/:code", (req, res) => {
  const { changes } = db.prepare("DELETE FROM invite_codes WHERE code = ? AND used_at IS NULL").run(req.params.code);
  if (!changes) return res.status(404).json({ error: "Code nicht gefunden oder bereits benutzt" });
  res.status(204).end();
});

// ---- User ----

router.get("/users", (_req, res) => {
  const users = db.prepare(`
    SELECT u.*, (SELECT COUNT(*) FROM jobs j WHERE j.user_id = u.id) AS job_count
    FROM users u ORDER BY u.created_at ASC
  `).all();
  res.json({ users: users.map((u) => ({ ...publicUser(u), jobCount: u.job_count })) });
});

router.patch("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User nicht gefunden" });

  const { disabled, role, password } = req.body || {};
  const isSelf = id === req.user.id;

  if (disabled !== undefined) {
    if (isSelf) return res.status(400).json({ error: "Eigenen Account nicht sperren" });
    db.prepare("UPDATE users SET disabled = ? WHERE id = ?").run(disabled ? 1 : 0, id);
  }
  if (role !== undefined) {
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "Ungültige Rolle" });
    if (isSelf && role !== "admin") return res.status(400).json({ error: "Eigene Admin-Rolle nicht entfernen" });
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  }
  if (password !== undefined) {
    if (String(password).length < 8) return res.status(400).json({ error: "Passwort muss mindestens 8 Zeichen haben" });
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(String(password), 12), id);
  }

  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)) });
});

router.delete("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: "Eigenen Account nicht löschen" });
  const { changes } = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (!changes) return res.status(404).json({ error: "User nicht gefunden" });
  res.status(204).end();
});

module.exports = router;

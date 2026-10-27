const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { db, publicUser } = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// Schutz gegen Passwort-Raten und Invite-Code-Durchprobieren (pro IP)
const limiterOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Zu viele Versuche. Bitte später erneut versuchen." },
};
const loginLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true });
const registerLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 60 * 1000, limit: 10 });

router.post("/login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "E-Mail oder Passwort falsch" });
  }
  if (user.disabled) return res.status(403).json({ error: "Account gesperrt" });

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post("/register", registerLimiter, (req, res) => {
  const { email, password, inviteCode } = req.body || {};
  const cleanEmail = String(email || "").trim();
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ error: "Ungültige E-Mail-Adresse" });
  if (!password || String(password).length < MIN_PASSWORD) {
    return res.status(400).json({ error: `Passwort muss mindestens ${MIN_PASSWORD} Zeichen haben` });
  }
  if (!inviteCode) return res.status(400).json({ error: "Invite-Code erforderlich" });

  const hash = bcrypt.hashSync(String(password), 12);

  const register = db.transaction(() => {
    const invite = db.prepare("SELECT * FROM invite_codes WHERE code = ?").get(String(inviteCode).trim());
    if (!invite || invite.used_at) throw { status: 400, message: "Invite-Code ungültig oder bereits benutzt" };
    if (invite.expires_at && invite.expires_at < new Date().toISOString()) {
      throw { status: 400, message: "Invite-Code abgelaufen" };
    }
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(cleanEmail)) {
      throw { status: 409, message: "E-Mail ist bereits registriert" };
    }
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(cleanEmail, hash);
    db.prepare("UPDATE invite_codes SET used_by = ?, used_at = datetime('now') WHERE code = ?")
      .run(lastInsertRowid, invite.code);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(lastInsertRowid);
  });

  try {
    const user = register();
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { db } = require("../db");

const isProd = process.env.NODE_ENV === "production";
if (!process.env.JWT_SECRET && isProd) {
  throw new Error("JWT_SECRET muss in Production gesetzt sein");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const API_KEY_PREFIX = "cc_";

function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function getBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// User bei jedem Request laden → Sperre/Löschung/Rollenänderung greift sofort
function attachUser(req, res, next, userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(401).json({ error: "User existiert nicht mehr" });
  if (user.disabled) return res.status(403).json({ error: "Account gesperrt" });
  req.user = user;
  next();
}

function verifyJwt(req, res, next, token) {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }
  attachUser(req, res, next, payload.sub);
}

// Nur Login-Token (Web-UI). API-Keys dürfen z. B. keine weiteren Keys erstellen.
function requireAuth(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: "Nicht angemeldet" });
  if (token.startsWith(API_KEY_PREFIX)) {
    return res.status(403).json({ error: "API-Keys gelten nur für /api/v1" });
  }
  verifyJwt(req, res, next, token);
}

// Login-Token oder persönlicher API-Key (für /api/v1)
function requireApiAuth(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ error: "API-Key fehlt (Header: Authorization: Bearer <key>)" });
  if (!token.startsWith(API_KEY_PREFIX)) return verifyJwt(req, res, next, token);

  const key = db.prepare("SELECT id, user_id FROM api_keys WHERE key_hash = ?").get(hashApiKey(token));
  if (!key) return res.status(401).json({ error: "API-Key ungültig oder widerrufen" });
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(key.id);
  attachUser(req, res, next, key.user_id);
}

function generateApiKey() {
  const key = API_KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
  return { key, hash: hashApiKey(key), prefix: key.slice(0, API_KEY_PREFIX.length + 6) };
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Nur für Admins" });
  next();
}

module.exports = { signToken, requireAuth, requireApiAuth, requireAdmin, generateApiKey };

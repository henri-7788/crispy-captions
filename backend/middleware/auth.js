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

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Nicht angemeldet" });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token ungültig oder abgelaufen" });
  }

  // User bei jedem Request laden → Sperre/Löschung/Rollenänderung greift sofort
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub);
  if (!user) return res.status(401).json({ error: "User existiert nicht mehr" });
  if (user.disabled) return res.status(403).json({ error: "Account gesperrt" });

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Nur für Admins" });
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };

const { db } = require("../db");

// Jede Transkription kostet OpenAI-Guthaben → Tageslimit pro User (Admins ausgenommen, 0 = unbegrenzt)
const MAX_PER_DAY = parseInt(process.env.MAX_TRANSCRIPTIONS_PER_DAY || "30");

function transcriptionsToday(userId) {
  return db
    .prepare("SELECT COUNT(*) AS n FROM usage WHERE user_id = ? AND kind = 'transcription' AND created_at >= datetime('now', '-1 day')")
    .get(userId).n;
}

// Gibt eine Fehlermeldung zurück, wenn das Limit erreicht ist, sonst null
function checkTranscriptionQuota(user) {
  if (user.role === "admin" || MAX_PER_DAY <= 0) return null;
  if (transcriptionsToday(user.id) >= MAX_PER_DAY) {
    return `Tageslimit erreicht (${MAX_PER_DAY} Transkriptionen in 24 Stunden)`;
  }
  return null;
}

function recordTranscription(userId) {
  db.prepare("INSERT INTO usage (user_id, kind) VALUES (?, 'transcription')").run(userId);
}

module.exports = { checkTranscriptionQuota, recordTranscription };

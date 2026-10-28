const express = require("express");
const { db } = require("../db");
const { generateApiKey } = require("../middleware/auth");

const router = express.Router();

const MAX_KEYS = 10;
const MAX_NAME = 40;

function serializeKey(row) {
  return { id: row.id, name: row.name, prefix: row.prefix, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at, id").all(req.user.id);
  res.json({ keys: rows.map(serializeKey) });
});

// Der Klartext-Key wird nur in dieser Antwort einmalig zurückgegeben
router.post("/", (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ error: `Name muss 1–${MAX_NAME} Zeichen haben` });
  }
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM api_keys WHERE user_id = ?").get(req.user.id);
  if (count >= MAX_KEYS) return res.status(400).json({ error: `Maximal ${MAX_KEYS} API-Keys möglich` });

  const { key, hash, prefix } = generateApiKey();
  const { lastInsertRowid } = db
    .prepare("INSERT INTO api_keys (user_id, name, key_hash, prefix) VALUES (?, ?, ?, ?)")
    .run(req.user.id, name, hash, prefix);
  const row = db.prepare("SELECT * FROM api_keys WHERE id = ?").get(lastInsertRowid);
  res.status(201).json({ key, apiKey: serializeKey(row) });
});

router.delete("/:id", (req, res) => {
  const { changes } = db.prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (!changes) return res.status(404).json({ error: "API-Key nicht gefunden" });
  res.status(204).end();
});

module.exports = router;

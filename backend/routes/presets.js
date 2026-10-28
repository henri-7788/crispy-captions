const express = require("express");
const { db } = require("../db");
const { normalizeStyle } = require("../utils/style");

const router = express.Router();

const MAX_PRESETS = 30;
const MAX_NAME = 40;

function serializePreset(row) {
  return { id: row.id, name: row.name, style: normalizeStyle(JSON.parse(row.style)), createdAt: row.created_at };
}

function listPresets(userId) {
  return db.prepare("SELECT * FROM presets WHERE user_id = ? ORDER BY created_at, id").all(userId).map(serializePreset);
}

// Für die API: Preset per Name (ohne Groß-/Kleinschreibung) oder per ID
function findPreset(userId, nameOrId) {
  const value = String(nameOrId).trim();
  const row =
    db.prepare("SELECT * FROM presets WHERE user_id = ? AND name = ? COLLATE NOCASE").get(userId, value) ||
    (/^\d+$/.test(value) ? db.prepare("SELECT * FROM presets WHERE user_id = ? AND id = ?").get(userId, value) : null);
  return row ? serializePreset(row) : null;
}

router.get("/", (req, res) => {
  res.json({ presets: listPresets(req.user.id) });
});

// Gleicher Name → bestehendes Preset wird überschrieben
router.post("/", (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ error: `Name muss 1–${MAX_NAME} Zeichen haben` });
  }
  const style = JSON.stringify(normalizeStyle(req.body?.style));

  const save = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM presets WHERE user_id = ? AND name = ?").get(req.user.id, name);
    if (existing) {
      db.prepare("UPDATE presets SET style = ? WHERE id = ?").run(style, existing.id);
      return existing.id;
    }
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM presets WHERE user_id = ?").get(req.user.id);
    if (count >= MAX_PRESETS) throw { status: 400, message: `Maximal ${MAX_PRESETS} Presets möglich` };
    return db.prepare("INSERT INTO presets (user_id, name, style) VALUES (?, ?, ?)").run(req.user.id, name, style).lastInsertRowid;
  });

  try {
    const id = save();
    res.status(201).json({ preset: serializePreset(db.prepare("SELECT * FROM presets WHERE id = ?").get(id)) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.delete("/:id", (req, res) => {
  const { changes } = db.prepare("DELETE FROM presets WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (!changes) return res.status(404).json({ error: "Preset nicht gefunden" });
  res.status(204).end();
});

module.exports = router;
module.exports.listPresets = listPresets;
module.exports.findPreset = findPreset;

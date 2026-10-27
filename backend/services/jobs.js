const path = require("path");
const { db } = require("../db");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

function createJob({ id, userId, filename, source = "web" }) {
  db.prepare("INSERT INTO jobs (id, user_id, filename, source) VALUES (?, ?, ?, ?)")
    .run(id, userId, filename, source);
}

// Liefert den Job nur, wenn er dem User gehört
function getOwnedJob(jobId, userId) {
  return db.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?").get(String(jobId), userId);
}

function updateJob(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE jobs SET ${sets} WHERE id = @id`).run({ ...fields, id });
}

function getUploadPath(job) {
  return path.join(UPLOADS_DIR, path.basename(job.filename));
}

module.exports = { createJob, getOwnedJob, updateJob, getUploadPath };

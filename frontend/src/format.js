export function formatDate(value) {
  if (!value) return "—";
  // SQLite liefert "YYYY-MM-DD HH:MM:SS" in UTC
  const d = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return d.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

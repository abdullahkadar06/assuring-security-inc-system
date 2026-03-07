export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function toMs(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}
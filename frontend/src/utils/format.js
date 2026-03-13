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

export function formatBreakMinutesPrecise(totalMinutes = 0) {
  const mins = Math.max(0, Number(totalMinutes || 0));
  const totalSeconds = Math.max(0, Math.round(mins * 60));

  if (totalSeconds <= 0) return "0s";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    if (minutes === 0 && seconds === 0) return `${hours}h`;
    if (seconds === 0) return `${hours}h ${minutes}m`;
    if (minutes === 0) return `${hours}h ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
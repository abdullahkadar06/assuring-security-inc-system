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

  if (!Number.isFinite(mins) || mins <= 0) return "0s";

  const totalSeconds = Math.floor(mins * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

export function formatHours(value = 0) {
  return Number(value ?? 0).toFixed(2);
}

export function formatMoney(value = 0, currency = "$") {
  return `${currency}${Number(value ?? 0).toFixed(2)}`;
}

export function formatDateCompact(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateTimeCompact(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatClockTime(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function isStandardEmail(value = "") {
  const email = String(value || "").trim().toLowerCase();

  if (!email) return false;
  if (email.length > 254) return false;

  const regex =
    /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

  return regex.test(email);
}
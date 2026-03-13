import {
  DEFAULT_GRACE_AFTER_MINUTES,
  DEFAULT_GRACE_BEFORE_MINUTES,
  SHIFT_KIND,
  SYSTEM_UTC_OFFSET_MINUTES,
} from "../constants/attendancePolicy.constants.js";

const OFFSET_MS = SYSTEM_UTC_OFFSET_MINUTES * 60 * 1000;

function toSystemPseudo(date) {
  return new Date(date.getTime() + OFFSET_MS);
}

function fromSystemPseudo(date) {
  return new Date(date.getTime() - OFFSET_MS);
}

function getSystemParts(date = new Date()) {
  const d = toSystemPseudo(date);

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(), // 0=Sun ... 6=Sat
  };
}

function buildSystemDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const pseudo = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return fromSystemPseudo(pseudo);
}

function startOfSystemDay(date) {
  const p = getSystemParts(date);
  return buildSystemDate(p.year, p.month, p.day, 0, 0, 0);
}

function addSystemDays(date, days) {
  const pseudo = toSystemPseudo(date);
  pseudo.setUTCDate(pseudo.getUTCDate() + days);
  return fromSystemPseudo(pseudo);
}

function formatSystemDateISO(date) {
  const p = getSystemParts(date);
  const y = String(p.year);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftKindFromUserShift(userShift) {
  const code = String(userShift?.code || "").toUpperCase();
  const name = String(userShift?.name || "").toUpperCase();

  if (code.includes("NIGHT") || name.includes("NIGHT")) {
    return SHIFT_KIND.NIGHT;
  }

  return SHIFT_KIND.MORNING;
}

function buildMorningShift(anchorDate) {
  const anchor = startOfSystemDay(anchorDate);
  const parts = getSystemParts(anchor);

  const scheduledStart = buildSystemDate(
    parts.year,
    parts.month,
    parts.day,
    8,
    0,
    0
  );

  const scheduledEnd = buildSystemDate(
    parts.year,
    parts.month,
    parts.day,
    16,
    0,
    0
  );

  return {
    shiftKind: SHIFT_KIND.MORNING,
    shiftCode: "MORNING",
    shiftName: "Morning Shift",
    anchorDate: formatSystemDateISO(anchor),
    scheduledStart,
    scheduledEnd,
  };
}

function buildNightShift(anchorDate) {
  const anchor = startOfSystemDay(anchorDate);
  const parts = getSystemParts(anchor);

  let startHour = 0;
  let endHour = 8;
  let endDayOffset = 0;
  let shiftCode = "NIGHT";
  let shiftName = "Night Shift";

  if (parts.weekday === 6) {
    startHour = 23;
    endHour = 7;
    endDayOffset = 1;
    shiftCode = "SATURDAY_NIGHT";
    shiftName = "Night Shift";
  } else if (parts.weekday === 0) {
    startHour = 23;
    endHour = 8;
    endDayOffset = 1;
    shiftCode = "SUNDAY_NIGHT";
    shiftName = "Night Shift";
  } else {
    startHour = 0;
    endHour = 8;
    endDayOffset = 0;
    shiftCode = "WEEKDAY_NIGHT";
    shiftName = "Night Shift";
  }

  const scheduledStart = buildSystemDate(
    parts.year,
    parts.month,
    parts.day,
    startHour,
    0,
    0
  );

  const endBase = addSystemDays(anchor, endDayOffset);
  const endParts = getSystemParts(endBase);

  const scheduledEnd = buildSystemDate(
    endParts.year,
    endParts.month,
    endParts.day,
    endHour,
    0,
    0
  );

  return {
    shiftKind: SHIFT_KIND.NIGHT,
    shiftCode,
    shiftName,
    anchorDate: formatSystemDateISO(anchor),
    scheduledStart,
    scheduledEnd,
  };
}

function applyGraceWindow(policy, graceBeforeMinutes, graceAfterMinutes) {
  const graceBefore = Number.isFinite(Number(graceBeforeMinutes))
    ? Number(graceBeforeMinutes)
    : DEFAULT_GRACE_BEFORE_MINUTES;

  const graceAfter = Number.isFinite(Number(graceAfterMinutes))
    ? Number(graceAfterMinutes)
    : DEFAULT_GRACE_AFTER_MINUTES;

  const earliest = new Date(
    policy.scheduledStart.getTime() - graceBefore * 60_000
  );

  // clock-in remains valid until shift end
  // graceAfter is used for late calculation, not for closing the clock-in window
  const latest = new Date(policy.scheduledEnd.getTime());

  return {
    ...policy,
    graceBeforeMinutes: graceBefore,
    graceAfterMinutes: graceAfter,
    earliestClockIn: earliest,
    latestClockIn: latest,
  };
}

export function resolveShiftPolicyForClockIn({
  now = new Date(),
  shiftKind,
  graceBeforeMinutes = DEFAULT_GRACE_BEFORE_MINUTES,
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  const today = startOfSystemDay(now);
  const yesterday = addSystemDays(today, -1);

  let candidates = [];

  if (shiftKind === SHIFT_KIND.MORNING) {
    candidates = [buildMorningShift(today)];
  } else {
    candidates = [buildNightShift(yesterday), buildNightShift(today)];
  }

  const withGrace = candidates.map((c) =>
    applyGraceWindow(c, graceBeforeMinutes, graceAfterMinutes)
  );

  const matched = withGrace.find(
    (c) => now >= c.earliestClockIn && now < c.latestClockIn
  );

  if (matched) {
    return {
      ...matched,
      clockInAllowed: true,
    };
  }

  const nearest = withGrace.sort((a, b) => {
    const da = Math.abs(now.getTime() - a.scheduledStart.getTime());
    const db = Math.abs(now.getTime() - b.scheduledStart.getTime());
    return da - db;
  })[0];

  return {
    ...nearest,
    clockInAllowed: false,
  };
}

export function calculateLateMinutes({
  actualClockIn,
  scheduledStart,
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  const diffMinutes = Math.floor(
    (actualClockIn.getTime() - scheduledStart.getTime()) / 60_000
  );

  if (diffMinutes <= 0) return 0;
  if (diffMinutes <= graceAfterMinutes) return diffMinutes;

  return graceAfterMinutes;
}

export function getShiftKindForUser(userShift) {
  return shiftKindFromUserShift(userShift);
}

export function getSystemDateISO(date = new Date()) {
  return formatSystemDateISO(date);
}
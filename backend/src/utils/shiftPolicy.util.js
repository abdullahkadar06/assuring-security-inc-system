import {
  DEFAULT_GRACE_AFTER_MINUTES,
  DEFAULT_GRACE_BEFORE_MINUTES,
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

function parseTimeParts(timeText, fallbackHour = 0, fallbackMinute = 0) {
  const raw = String(timeText || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return {
      hour: fallbackHour,
      minute: fallbackMinute,
      second: 0,
    };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] || 0),
  };
}

function buildShiftFromRow(anchorDate, userShift) {
  const anchor = startOfSystemDay(anchorDate);
  const parts = getSystemParts(anchor);

  const start = parseTimeParts(userShift?.start_time, 8, 0);
  const end = parseTimeParts(userShift?.end_time, 16, 0);

  const scheduledStart = buildSystemDate(
    parts.year,
    parts.month,
    parts.day,
    start.hour,
    start.minute,
    start.second
  );

  let scheduledEnd = buildSystemDate(
    parts.year,
    parts.month,
    parts.day,
    end.hour,
    end.minute,
    end.second
  );

  // cross-midnight shift
  if (scheduledEnd.getTime() <= scheduledStart.getTime()) {
    const nextDay = addSystemDays(anchor, 1);
    const nextParts = getSystemParts(nextDay);

    scheduledEnd = buildSystemDate(
      nextParts.year,
      nextParts.month,
      nextParts.day,
      end.hour,
      end.minute,
      end.second
    );
  }

  return {
    shiftCode: String(userShift?.code || "SHIFT"),
    shiftName: String(userShift?.name || "Shift"),
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

  const earliestClockIn = new Date(
    policy.scheduledStart.getTime() - graceBefore * 60_000
  );

  // SAX: clock-in waa la oggol yahay inta shift-ku socdo
  const latestClockIn = new Date(policy.scheduledEnd.getTime());

  const autoCloseAt = new Date(
    policy.scheduledEnd.getTime() + graceAfter * 60_000
  );

  return {
    ...policy,
    graceBeforeMinutes: graceBefore,
    graceAfterMinutes: graceAfter,
    earliestClockIn,
    latestClockIn,
    autoCloseAt,
  };
}

export function resolveShiftPolicyForClockIn({
  now = new Date(),
  userShift,
  graceBeforeMinutes = DEFAULT_GRACE_BEFORE_MINUTES,
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  const today = startOfSystemDay(now);
  const yesterday = addSystemDays(today, -1);

  // yesterday + today si night shift after-midnight uusan u lumin
  const candidates = [
    buildShiftFromRow(yesterday, userShift),
    buildShiftFromRow(today, userShift),
  ];

  const withGrace = candidates.map((candidate) =>
    applyGraceWindow(candidate, graceBeforeMinutes, graceAfterMinutes)
  );

  const matched = withGrace.find(
    (candidate) =>
      now.getTime() >= candidate.earliestClockIn.getTime() &&
      now.getTime() <= candidate.latestClockIn.getTime()
  );

  if (matched) {
    return {
      ...matched,
      clockInAllowed: true,
    };
  }

  const nearest = [...withGrace].sort((a, b) => {
    const da = Math.abs(now.getTime() - a.scheduledStart.getTime());
    const db = Math.abs(now.getTime() - b.scheduledStart.getTime());
    return da - db;
  })[0];

  return {
    ...nearest,
    clockInAllowed: false,
  };
}

export function getAutoCloseTimeForAttendance({
  scheduledEnd,
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  if (!scheduledEnd) return null;

  return new Date(
    new Date(scheduledEnd).getTime() + Number(graceAfterMinutes || 0) * 60_000
  );
}

export function shouldAutoCloseAttendance({
  scheduledEnd,
  now = new Date(),
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  if (!scheduledEnd) return false;

  const autoCloseAt = getAutoCloseTimeForAttendance({
    scheduledEnd,
    graceAfterMinutes,
  });

  return Boolean(autoCloseAt && now.getTime() >= autoCloseAt.getTime());
}

export function calculateLateMinutes({
  actualClockIn,
  scheduledStart,
  graceAfterMinutes = DEFAULT_GRACE_AFTER_MINUTES,
}) {
  const actual = new Date(actualClockIn);
  const scheduled = new Date(scheduledStart);

  const diffMinutes = Math.floor(
    (actual.getTime() - scheduled.getTime()) / 60_000
  );

  if (diffMinutes <= 0) return 0;

  // late report ahaan ha qoro daahitaanka oo dhan
  // deduction logic meel kale ha ka go'do
  return diffMinutes;
}

export function getSystemDateISO(date = new Date()) {
  return formatSystemDateISO(date);
}
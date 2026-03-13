function normalizeTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function getShiftKind(source = {}) {
  const code = String(source?.shift_code || source?.code || "").toUpperCase();
  const name = String(source?.shift_name || source?.name || "").toUpperCase();

  if (code.includes("NIGHT") || name.includes("NIGHT")) {
    return "NIGHT";
  }

  if (code.includes("MORNING") || name.includes("MORNING")) {
    return "MORNING";
  }

  return null;
}

function getNightPolicyRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const hour = d.getHours();

  // after midnight but before 08:00 on Monday belongs to Sunday night
  if (day === 1 && hour < 8) {
    return {
      name: "Night Shift",
      start: "23:00",
      end: "08:00",
    };
  }

  // after midnight but before 07:00 on Sunday belongs to Saturday night
  if (day === 0 && hour < 7) {
    return {
      name: "Night Shift",
      start: "23:00",
      end: "07:00",
    };
  }

  // Saturday night
  if (day === 6) {
    return {
      name: "Night Shift",
      start: "23:00",
      end: "07:00",
    };
  }

  // Sunday night
  if (day === 0) {
    return {
      name: "Night Shift",
      start: "23:00",
      end: "08:00",
    };
  }

  // normal weekday night
  return {
    name: "Night Shift",
    start: "00:00",
    end: "08:00",
  };
}

function getPolicyTimeRange(shiftKind, date = new Date()) {
  if (shiftKind === "MORNING") {
    return {
      name: "Morning Shift",
      start: "08:00",
      end: "16:00",
    };
  }

  if (shiftKind === "NIGHT") {
    return getNightPolicyRange(date);
  }

  return null;
}

export function formatShiftTimeRange(start, end) {
  const s = normalizeTime(start);
  const e = normalizeTime(end);

  if (!s || !e) return "";
  return `${s} - ${e}`;
}

export function formatShiftLabel(shift) {
  if (!shift) return "Not Assigned";

  const name = shift.shift_name || shift.name || shift.code || "Shift";

  const start = shift.shift_start || shift.start_time || shift.start || null;
  const end = shift.shift_end || shift.end_time || shift.end || null;

  const range = formatShiftTimeRange(start, end);

  if (!hasText(range)) return name;
  return `${name} (${range})`;
}

export function formatUserShift(user, date = new Date()) {
  if (!user) return "Not Assigned";

  const shiftKind = getShiftKind(user);

  if (shiftKind) {
    const policy = getPolicyTimeRange(shiftKind, date);

    if (policy) {
      return `${policy.name} (${policy.start} - ${policy.end})`;
    }
  }

  const shiftName = user.shift_name || user.name || null;
  const shiftStart = user.shift_start || user.start_time || null;
  const shiftEnd = user.shift_end || user.end_time || null;

  if (!shiftName || !shiftStart || !shiftEnd) {
    return "Not Assigned";
  }

  return `${shiftName} (${normalizeTime(shiftStart)} - ${normalizeTime(shiftEnd)})`;
}

export function formatShiftOption(shift) {
  return formatShiftLabel(shift);
}
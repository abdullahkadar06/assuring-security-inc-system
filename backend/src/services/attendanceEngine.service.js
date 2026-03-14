import { pool } from "../db/pool.js";
import { auditLog } from "../utils/audit.js";
import {
  ATTENDANCE_STATUS,
  CLOSE_REASON,
  DEFAULT_GRACE_AFTER_MINUTES,
  FINALIZED_ATTENDANCE_STATUSES,
  MAX_SHIFT_HOURS,
  PAID_BREAK_LIMIT_SECONDS,
  SYSTEM_UTC_OFFSET_MINUTES,
} from "../constants/attendancePolicy.constants.js";
import {
  calculateLateMinutes,
  resolveShiftPolicyForClockIn,
} from "../utils/shiftPolicy.util.js";

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

function getSystemDayBounds(date = new Date()) {
  const p = getSystemParts(date);

  const start = buildSystemDate(p.year, p.month, p.day, 0, 0, 0);
  const end = buildSystemDate(p.year, p.month, p.day, 23, 59, 59);

  return { start, end };
}

async function getUserShift(client, userId) {
  const r = await client.query(
    `SELECT
        u.id as user_id,
        u.shift_id,
        u.is_active,
        u.hourly_rate,
        s.code,
        s.name,
        s.start_time::text as start_time,
        s.end_time::text as end_time,
        s.grace_before_minutes,
        s.grace_after_minutes,
        s.is_active as shift_active
     FROM users u
     LEFT JOIN shifts s ON s.id = u.shift_id
     WHERE u.id = $1`,
    [userId]
  );

  return r.rowCount ? r.rows[0] : null;
}

async function getOpenAttendance(client, userId) {
  const r = await client.query(
    `SELECT
        a.id,
        a.user_id,
        a.shift_id,
        a.clock_in,
        a.clock_out,
        a.total_hours,
        a.paid_hours,
        a.status,
        a.scheduled_start,
        a.scheduled_end,
        COALESCE(u.hourly_rate, 0) AS hourly_rate,
        COALESCE(s.grace_after_minutes, $3) AS grace_after_minutes
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN shifts s ON s.id = a.shift_id
     WHERE a.user_id = $1
       AND a.status = $2
     ORDER BY a.id DESC
     LIMIT 1`,
    [userId, ATTENDANCE_STATUS.OPEN, DEFAULT_GRACE_AFTER_MINUTES]
  );

  return r.rowCount ? r.rows[0] : null;
}

function roundHours(value) {
  return Number(Number(value || 0).toFixed(2));
}

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveAutoClockOutTime(attendance, forcedClockOutAt = null) {
  const scheduledEnd = safeDate(attendance?.scheduled_end);
  const forced = safeDate(forcedClockOutAt);

  if (scheduledEnd && forced) {
    return forced.getTime() <= scheduledEnd.getTime() ? forced : scheduledEnd;
  }

  if (scheduledEnd) return scheduledEnd;
  if (forced) return forced;

  return new Date();
}

export function calculateAttendanceMetrics({
  clockIn,
  clockOut,
  breakSeconds = 0,
  paidBreakLimitSeconds = PAID_BREAK_LIMIT_SECONDS,
  maxPaidShiftHours = MAX_SHIFT_HOURS,
}) {
  const inAt = safeDate(clockIn);
  const outAt = safeDate(clockOut);

  if (!inAt || !outAt) {
    return {
      rawSeconds: 0,
      breakSeconds: 0,
      unpaidBreakSeconds: 0,
      workedSeconds: 0,
      paidSeconds: 0,
      totalHours: 0,
      paidHours: 0,
    };
  }

  const rawSeconds = Math.max(
    0,
    Math.floor((outAt.getTime() - inAt.getTime()) / 1000)
  );

  const normalizedBreakSeconds = Math.max(0, Number(breakSeconds || 0));
  const unpaidBreakSeconds = Math.max(
    0,
    normalizedBreakSeconds - paidBreakLimitSeconds
  );

  const workedSeconds = Math.max(0, rawSeconds - normalizedBreakSeconds);
  const paidSeconds = Math.max(0, rawSeconds - unpaidBreakSeconds);

  return {
    rawSeconds,
    breakSeconds: normalizedBreakSeconds,
    unpaidBreakSeconds,
    workedSeconds,
    paidSeconds,
    totalHours: roundHours(workedSeconds / 3600),
    paidHours: roundHours(Math.min(maxPaidShiftHours, paidSeconds / 3600)),
  };
}

async function closeAnyOpenBreaks(client, attendanceId, closedAt = null) {
  const resolvedClosedAt = safeDate(closedAt) || new Date();

  await client.query(
    `UPDATE breaks
     SET break_end = $2
     WHERE attendance_id = $1
       AND break_end IS NULL`,
    [attendanceId, resolvedClosedAt]
  );
}

async function getBreakSeconds(client, attendanceId) {
  const breakResult = await client.query(
    `SELECT COALESCE(
        SUM(EXTRACT(EPOCH FROM (break_end - break_start))),
        0
      ) AS break_seconds
     FROM breaks
     WHERE attendance_id = $1
       AND break_start IS NOT NULL
       AND break_end IS NOT NULL`,
    [attendanceId]
  );

  return Number(breakResult.rows[0]?.break_seconds ?? 0);
}

async function upsertPayroll(
  client,
  { userId, attendanceId, paidHours, hourlyRate }
) {
  const safeRate = Number(hourlyRate || 0);
  const safePaidHours = Number(paidHours || 0);
  const totalPay = Number((safePaidHours * safeRate).toFixed(2));

  await client.query(
    `INSERT INTO payroll (
        user_id,
        attendance_id,
        regular_hours,
        overtime_hours,
        hourly_rate,
        total_pay
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (attendance_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       regular_hours = EXCLUDED.regular_hours,
       overtime_hours = EXCLUDED.overtime_hours,
       hourly_rate = EXCLUDED.hourly_rate,
       total_pay = EXCLUDED.total_pay`,
    [userId, attendanceId, safePaidHours, 0, safeRate, totalPay]
  );

  return {
    attendance_id: attendanceId,
    total_pay: totalPay,
    regular_hours: safePaidHours,
    overtime_hours: 0,
    hourly_rate: safeRate,
  };
}

export async function clockInUser({ userId, actorUserId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [Number(userId)]);

    const us = await getUserShift(client, userId);

    if (!us || !us.is_active || !us.shift_active) {
      await client.query("ROLLBACK");
      return {
        status: 404,
        body: { message: "User or shift is not active." },
      };
    }

    if (!us.shift_id) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: { message: "No shift assigned." },
      };
    }

    const existingOpen = await getOpenAttendance(client, userId);
    if (existingOpen) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { message: "An open shift already exists." },
      };
    }

    const now = new Date();

    const policy = resolveShiftPolicyForClockIn({
      now,
      userShift: us,
      graceBeforeMinutes: us.grace_before_minutes,
      graceAfterMinutes: us.grace_after_minutes,
    });

    if (!policy.clockInAllowed) {
      await client.query("ROLLBACK");
      return {
        status: 400,
        body: {
          message: "Clock-in is not available for this shift.",
          shift_window: {
            open: policy.earliestClockIn,
            close: policy.latestClockIn,
          },
          scheduled_start: policy.scheduledStart,
          scheduled_end: policy.scheduledEnd,
          auto_close_at: policy.autoCloseAt,
        },
      };
    }

    const existingSameShift = await client.query(
      `SELECT id, status
       FROM attendance
       WHERE user_id = $1
         AND scheduled_start = $2
       ORDER BY id DESC
       LIMIT 1`,
      [userId, policy.scheduledStart]
    );

    if (existingSameShift.rowCount > 0) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { message: "Attendance already exists for this shift." },
      };
    }

    const lateMinutes = calculateLateMinutes({
      actualClockIn: now,
      scheduledStart: policy.scheduledStart,
      graceAfterMinutes: policy.graceAfterMinutes,
    });

    const ins = await client.query(
      `INSERT INTO attendance (
          user_id,
          shift_id,
          clock_in,
          clock_out,
          total_hours,
          paid_hours,
          status,
          scheduled_start,
          scheduled_end,
          late_minutes
       )
       VALUES ($1, $2, $3, NULL, 0, 0, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        us.shift_id,
        now,
        ATTENDANCE_STATUS.OPEN,
        policy.scheduledStart,
        policy.scheduledEnd,
        lateMinutes,
      ]
    );

    await client.query("COMMIT");

    await auditLog({
      actor_user_id: actorUserId,
      action: "CLOCK_IN",
      entity: "attendance",
      entity_id: ins.rows[0].id,
      meta: {
        scheduled_start: policy.scheduledStart,
        scheduled_end: policy.scheduledEnd,
        late_minutes: lateMinutes,
        shift_code: policy.shiftCode,
        auto_close_at: policy.autoCloseAt,
      },
    });

    return {
      status: 201,
      body: {
        attendance: ins.rows[0],
        message: "Clock-in successful.",
        policy: {
          shift_code: policy.shiftCode,
          shift_name: policy.shiftName,
          scheduled_start: policy.scheduledStart,
          scheduled_end: policy.scheduledEnd,
          earliest_clock_in: policy.earliestClockIn,
          latest_clock_in: policy.latestClockIn,
          auto_close_at: policy.autoCloseAt,
        },
      },
    };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function clockOutUser({
  userId,
  actorUserId,
  isAuto = false,
  forcedClockOutAt = null,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [Number(userId)]);

    const attendance = await getOpenAttendance(client, userId);

    if (!attendance) {
      await client.query("ROLLBACK");
      return {
        status: 404,
        body: { message: "No open attendance found." },
      };
    }

    const attendanceId = attendance.id;

    const clockOut = isAuto
      ? resolveAutoClockOutTime(attendance, forcedClockOutAt)
      : new Date();

    await closeAnyOpenBreaks(client, attendanceId, clockOut);

    const breakSeconds = await getBreakSeconds(client, attendanceId);

    const metrics = calculateAttendanceMetrics({
      clockIn: attendance.clock_in,
      clockOut,
      breakSeconds,
      paidBreakLimitSeconds: PAID_BREAK_LIMIT_SECONDS,
      maxPaidShiftHours: MAX_SHIFT_HOURS,
    });

    const newStatus = isAuto
      ? ATTENDANCE_STATUS.AUTO_CLOSED
      : ATTENDANCE_STATUS.CLOSED;

    const upd = await client.query(
      `UPDATE attendance
       SET clock_out = $2,
           status = $3,
           total_hours = $4,
           paid_hours = $5
       WHERE id = $1
         AND status = $6
       RETURNING *`,
      [
        attendanceId,
        clockOut,
        newStatus,
        metrics.totalHours,
        metrics.paidHours,
        ATTENDANCE_STATUS.OPEN,
      ]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return {
        status: 409,
        body: { message: "Attendance is already closed." },
      };
    }

    const payroll = await upsertPayroll(client, {
      userId: attendance.user_id,
      attendanceId,
      paidHours: metrics.paidHours,
      hourlyRate: attendance.hourly_rate,
    });

    await client.query("COMMIT");

    await auditLog({
      actor_user_id: actorUserId,
      action: isAuto ? "AUTO_CLOCK_OUT" : "CLOCK_OUT",
      entity: "attendance",
      entity_id: attendanceId,
      meta: {
        close_reason: isAuto
          ? CLOSE_REASON.AUTO_SHIFT_CLOSE
          : CLOSE_REASON.MANUAL,
        total_hours: metrics.totalHours,
        paid_hours: metrics.paidHours,
        break_seconds: metrics.breakSeconds,
        unpaid_break_seconds: metrics.unpaidBreakSeconds,
        paid_break_limit_seconds: PAID_BREAK_LIMIT_SECONDS,
        total_pay: payroll.total_pay,
        closed_at: clockOut,
      },
    });

    return {
      status: 200,
      body: {
        attendance: upd.rows[0],
        payroll,
        message: isAuto ? "Shift closed automatically." : "Clock-out successful.",
      },
    };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function getTodayAttendanceForUser(userId) {
  const { start, end } = getSystemDayBounds(new Date());

  const result = await pool.query(
    `WITH base AS (
       SELECT
         a.*,
         CASE
           WHEN a.status IN ('CLOSED', 'AUTO_CLOSED') AND a.clock_out IS NOT NULL
             THEN a.clock_out
           WHEN a.status = 'OPEN' AND a.scheduled_end IS NOT NULL
             THEN LEAST(NOW(), a.scheduled_end)
           WHEN a.status = 'OPEN'
             THEN NOW()
           ELSE a.clock_out
         END AS effective_clock_out
       FROM attendance a
       WHERE a.user_id = $1
         AND (
           (a.scheduled_start IS NOT NULL AND a.scheduled_start BETWEEN $2 AND $3)
           OR
           (a.created_at BETWEEN $2 AND $3)
           OR
           (a.clock_in BETWEEN $2 AND $3)
         )
     )
     SELECT
       b.*,
       COALESCE(
         ROUND(
           (
             GREATEST(
               0,
               EXTRACT(EPOCH FROM (COALESCE(b.effective_clock_out, b.clock_in) - b.clock_in))
               - COALESCE((
                   SELECT SUM(
                     GREATEST(
                       0,
                       EXTRACT(
                         EPOCH FROM (
                           LEAST(COALESCE(br.break_end, b.effective_clock_out), b.effective_clock_out) - br.break_start
                         )
                       )
                     )
                   )
                   FROM breaks br
                   WHERE br.attendance_id = b.id
                     AND br.break_start IS NOT NULL
                     AND br.break_start < COALESCE(b.effective_clock_out, NOW())
                 ), 0)
             ) / 3600.0
           )::numeric,
           2
         ),
         0
       ) AS total_hours_live,
       COALESCE(
         ROUND(
           LEAST(
             $4::numeric,
             (
               GREATEST(
                 0,
                 EXTRACT(EPOCH FROM (COALESCE(b.effective_clock_out, b.clock_in) - b.clock_in))
                 - GREATEST(
                     0,
                     COALESCE((
                       SELECT SUM(
                         GREATEST(
                           0,
                           EXTRACT(
                             EPOCH FROM (
                               LEAST(COALESCE(br.break_end, b.effective_clock_out), b.effective_clock_out) - br.break_start
                             )
                           )
                         )
                       )
                       FROM breaks br
                       WHERE br.attendance_id = b.id
                         AND br.break_start IS NOT NULL
                         AND br.break_start < COALESCE(b.effective_clock_out, NOW())
                     ), 0) - $5
                   )
               ) / 3600.0
             )
           )::numeric,
           2
         ),
         0
       ) AS paid_hours_live,
       COALESCE(
         ROUND(
           COALESCE((
             SELECT SUM(
               GREATEST(
                 0,
                 EXTRACT(
                   EPOCH FROM (
                     LEAST(COALESCE(br.break_end, b.effective_clock_out), b.effective_clock_out) - br.break_start
                   )
                 )
               )
             )
             FROM breaks br
             WHERE br.attendance_id = b.id
               AND br.break_start IS NOT NULL
               AND br.break_start < COALESCE(b.effective_clock_out, NOW())
           ), 0) / 60.0,
           2
         ),
         0
       ) AS break_minutes
     FROM base b
     ORDER BY b.id DESC`,
    [userId, start, end, MAX_SHIFT_HOURS, PAID_BREAK_LIMIT_SECONDS]
  );

  return result.rows.map((row) => ({
    ...row,
    total_hours: FINALIZED_ATTENDANCE_STATUSES.includes(row.status)
      ? Number(row.total_hours ?? 0)
      : Number(row.total_hours_live ?? 0),
    paid_hours: FINALIZED_ATTENDANCE_STATUSES.includes(row.status)
      ? Number(row.paid_hours ?? 0)
      : Number(row.paid_hours_live ?? 0),
    break_minutes: Number(row.break_minutes ?? 0),
  }));
}

export async function autoCloseDueAttendances() {
  const due = await pool.query(
    `SELECT
        a.user_id,
        a.id AS attendance_id,
        a.scheduled_end,
        COALESCE(s.grace_after_minutes, $2) AS grace_after_minutes
     FROM attendance a
     LEFT JOIN shifts s ON s.id = a.shift_id
     WHERE a.status = $1
       AND a.scheduled_end IS NOT NULL
       AND NOW() >= (
         a.scheduled_end
         + (COALESCE(s.grace_after_minutes, $2) * INTERVAL '1 minute')
       )
     ORDER BY a.id ASC`,
    [ATTENDANCE_STATUS.OPEN, DEFAULT_GRACE_AFTER_MINUTES]
  );

  if (due.rows.length > 0) {
    console.log("AUTO CLOSE DUE COUNT:", due.rows.length);
  }

  for (const row of due.rows) {
    try {
      await clockOutUser({
        userId: row.user_id,
        actorUserId: row.user_id,
        isAuto: true,
        forcedClockOutAt: row.scheduled_end,
      });

      console.log("AUTO CLOSED:", row.attendance_id);
    } catch (e) {
      console.error("AUTO CLOSE FAILED:", {
        attendanceId: row.attendance_id,
        userId: row.user_id,
        error: e?.message || e,
      });
    }
  }
}
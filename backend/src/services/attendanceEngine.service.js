import { pool } from "../db/pool.js";
import { auditLog } from "../utils/audit.js";
import {
  ATTENDANCE_STATUS,
  CLOSE_REASON,
  MAX_SHIFT_HOURS,
  MAX_SHIFT_MINUTES,
} from "../constants/attendancePolicy.constants.js";
import {
  calculateLateMinutes,
  getShiftKindForUser,
  resolveShiftPolicyForClockIn,
} from "../utils/shiftPolicy.util.js";

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
        COALESCE(u.hourly_rate, 0) AS hourly_rate
     FROM attendance a
     JOIN users u ON u.id = a.user_id
     WHERE a.user_id = $1
       AND a.status = $2
     ORDER BY a.id DESC
     LIMIT 1`,
    [userId, ATTENDANCE_STATUS.OPEN]
  );

  return r.rowCount ? r.rows[0] : null;
}

function roundHours(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function closeAnyOpenBreaks(client, attendanceId) {
  await client.query(
    `UPDATE breaks
     SET break_end = NOW()
     WHERE attendance_id = $1
       AND break_end IS NULL`,
    [attendanceId]
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
  const totalPay = roundHours(Number(paidHours) * Number(hourlyRate || 0));

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
    [userId, attendanceId, paidHours, 0, Number(hourlyRate || 0), totalPay]
  );

  return {
    attendance_id: attendanceId,
    total_pay: totalPay,
    regular_hours: paidHours,
    overtime_hours: 0,
    hourly_rate: Number(hourlyRate || 0),
  };
}

export async function clockInUser({ userId, actorUserId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // protect against double click / race condition
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
      shiftKind: getShiftKindForUser(us),
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
        },
      };
    }

    // prevent second attendance for same scheduled shift
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

export async function clockOutUser({ userId, actorUserId, isAuto = false }) {
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

    await closeAnyOpenBreaks(client, attendanceId);

    const breakSeconds = await getBreakSeconds(client, attendanceId);

    const clockIn = new Date(attendance.clock_in);
    const clockOut = isAuto
      ? new Date(clockIn.getTime() + MAX_SHIFT_MINUTES * 60_000)
      : new Date();

    const rawSeconds = Math.max(
      0,
      Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000)
    );

    const workedSeconds = Math.max(0, rawSeconds - breakSeconds);
    const totalHours = roundHours(workedSeconds / 3600);
    const paidHours = roundHours(Math.min(MAX_SHIFT_HOURS, totalHours));

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
        totalHours,
        paidHours,
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
      paidHours,
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
        total_hours: totalHours,
        paid_hours: paidHours,
        break_seconds: breakSeconds,
        total_pay: payroll.total_pay,
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
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const result = await pool.query(
    `SELECT
        a.*,
        COALESCE(
          ROUND(
            SUM(
              EXTRACT(EPOCH FROM (COALESCE(b.break_end, NOW()) - b.break_start))
            ) / 60.0,
            2
          ),
          0
        ) AS break_minutes
     FROM attendance a
     LEFT JOIN breaks b
       ON b.attendance_id = a.id
      AND b.break_start IS NOT NULL
     WHERE a.user_id = $1
       AND (
         (a.scheduled_start IS NOT NULL AND a.scheduled_start BETWEEN $2 AND $3)
         OR
         (a.created_at BETWEEN $2 AND $3)
       )
     GROUP BY a.id
     ORDER BY a.id DESC`,
    [userId, start, end]
  );

  return result.rows;
}

export async function autoCloseDueAttendances() {
  const due = await pool.query(
    `SELECT a.user_id
     FROM attendance a
     WHERE a.status = $1
       AND a.clock_in <= NOW() - INTERVAL '8 hours'
     ORDER BY a.id ASC`,
    [ATTENDANCE_STATUS.OPEN]
  );

  for (const row of due.rows) {
    try {
      await clockOutUser({
        userId: row.user_id,
        actorUserId: row.user_id,
        isAuto: true,
      });
    } catch (e) {
      console.error("AUTO CLOSE FAILED:", e);
    }
  }
}
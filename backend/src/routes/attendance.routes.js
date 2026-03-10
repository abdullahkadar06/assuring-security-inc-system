import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

// --- HELPERS ---
function timeToParts(t) {
  const [h, m] = t.split(":").map(Number);
  return { h, m };
}

function toLocalDate(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function makeDateWithTime(baseDate, timeStr) {
  const { h, m } = timeToParts(timeStr);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    h,
    m,
    0,
    0
  );
}

async function getUserShift(userId) {
  const r = await pool.query(
    `SELECT
        u.id as user_id,
        u.shift_id,
        u.is_active,
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

function resolveShiftWindow(now, shiftStart, shiftEnd, graceBeforeMin, graceAfterMin) {
  const today = toLocalDate(now);
  const startToday = makeDateWithTime(today, shiftStart);
  const endTodaySame = makeDateWithTime(today, shiftEnd);
  const crossesMidnight = endTodaySame <= startToday;

  let scheduledStart;
  let scheduledEnd;

  if (!crossesMidnight) {
    scheduledStart = startToday;
    scheduledEnd = endTodaySame;
  } else {
    const endTomorrow = makeDateWithTime(addDays(today, 1), shiftEnd);

    if (now < endTodaySame) {
      scheduledStart = makeDateWithTime(addDays(today, -1), shiftStart);
      scheduledEnd = endTodaySame;
    } else {
      scheduledStart = startToday;
      scheduledEnd = endTomorrow;
    }
  }

  const earliest = new Date(
    scheduledStart.getTime() - graceBeforeMin * 60_000
  );
  const latest = new Date(
    scheduledStart.getTime() + graceAfterMin * 60_000
  );

  return { scheduledStart, scheduledEnd, earliest, latest };
}

router.post("/clock-in", requireAuth, async (req, res, next) => {
  try {
    const us = await getUserShift(req.user.id);

    if (!us || !us.is_active || !us.shift_active) {
      return res.status(404).json({ message: "User or shift not active" });
    }

    if (!us.shift_id) {
      return res.status(400).json({ message: "No shift assigned to this user" });
    }

    const existingOpen = await pool.query(
      `SELECT id
       FROM attendance
       WHERE user_id = $1 AND status = 'OPEN'
       ORDER BY id DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (existingOpen.rowCount > 0) {
      return res.status(409).json({ message: "You already have an OPEN shift" });
    }

    const existingToday = await pool.query(
      `SELECT id, status
       FROM attendance
       WHERE user_id = $1
         AND created_at::date = CURRENT_DATE
       ORDER BY id DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (existingToday.rowCount > 0) {
      const status = existingToday.rows[0].status;
      if (status === "CLOSED") {
        return res.status(409).json({ message: "Today's shift is already closed" });
      }
      if (status === "OPEN") {
        return res.status(409).json({ message: "You already have an OPEN shift" });
      }
    }

    const now = new Date();
    const win = resolveShiftWindow(
      now,
      us.start_time,
      us.end_time,
      us.grace_before_minutes,
      us.grace_after_minutes
    );

    const lateMinutes = Math.max(
      0,
      Math.floor((now.getTime() - win.scheduledStart.getTime()) / 60000)
    );

    const ins = await pool.query(
      `INSERT INTO attendance
        (user_id, shift_id, clock_in, clock_out, total_hours, paid_hours, status, scheduled_start, scheduled_end, late_minutes)
       VALUES
        ($1, $2, NOW(), NULL, 0, 0, 'OPEN', $3, $4, $5)
       RETURNING *`,
      [req.user.id, us.shift_id, win.scheduledStart, win.scheduledEnd, lateMinutes]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "CLOCK_IN",
      entity: "attendance",
      entity_id: ins.rows[0].id,
    });

    res.status(201).json({ attendance: ins.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post("/clock-out", requireAuth, async (req, res, next) => {
  try {
    const open = await pool.query(
      `SELECT id, clock_in
       FROM attendance
       WHERE user_id = $1 AND status = 'OPEN'
       ORDER BY id DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (open.rowCount === 0) {
      return res.status(404).json({ message: "No OPEN attendance found" });
    }

    const attendance = open.rows[0];
    const attendanceId = attendance.id;

    await pool.query(
      `UPDATE breaks
       SET break_end = NOW()
       WHERE attendance_id = $1
         AND break_end IS NULL`,
      [attendanceId]
    );

    const breakResult = await pool.query(
      `SELECT
         COALESCE(SUM(EXTRACT(EPOCH FROM (break_end - break_start))), 0) AS break_seconds
       FROM breaks
       WHERE attendance_id = $1
         AND break_start IS NOT NULL
         AND break_end IS NOT NULL`,
      [attendanceId]
    );

    const breakSeconds = Number(breakResult.rows[0]?.break_seconds ?? 0);
    const clockIn = new Date(attendance.clock_in);
    const clockOut = new Date();

    const rawSeconds = Math.max(
      0,
      Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000)
    );

    const workedSeconds = Math.max(0, rawSeconds - breakSeconds);
    const totalHours = Number((workedSeconds / 3600).toFixed(2));
    const paidHours = totalHours;

    const upd = await pool.query(
      `UPDATE attendance
       SET clock_out = NOW(),
           status = 'CLOSED',
           total_hours = $2,
           paid_hours = $3
       WHERE id = $1
       RETURNING *`,
      [attendanceId, totalHours, paidHours]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "CLOCK_OUT",
      entity: "attendance",
      entity_id: attendanceId,
      meta: {
        total_hours: totalHours,
        paid_hours: paidHours,
        break_seconds: breakSeconds,
      },
    });

    res.json({ attendance: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get("/today", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         a.*,
         COALESCE(
           ROUND(
             SUM(
               EXTRACT(
                 EPOCH FROM (
                   COALESCE(b.break_end, NOW()) - b.break_start
                 )
               )
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
         AND a.created_at::date = CURRENT_DATE
       GROUP BY a.id
       ORDER BY a.id DESC`,
      [req.user.id]
    );

    res.json({ attendance: result.rows });
  } catch (e) {
    next(e);
  }
});

export default router;
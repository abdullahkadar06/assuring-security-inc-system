import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const clockInSchema = z.object({
  user_id: z.number().int().positive().optional(),
});

const clockOutSchema = z.object({
  attendance_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
});

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
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0);
}

async function getUserShift(userId) {
  const r = await pool.query(
    `SELECT u.id as user_id, u.shift_id, u.is_active,
            s.code, s.name,
            s.start_time::text as start_time, s.end_time::text as end_time,
            s.grace_before_minutes, s.grace_after_minutes, s.is_active as shift_active
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

  const earliest = new Date(scheduledStart.getTime() - graceBeforeMin * 60_000);
  const latest = new Date(scheduledStart.getTime() + graceAfterMin * 60_000);

  return { scheduledStart, scheduledEnd, earliest, latest };
}

router.post("/clock-in", requireAuth, async (req, res, next) => {
  try {
    const parsed = clockInSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    const targetUserId =
      req.user.role === "ADMIN" && parsed.data.user_id ? parsed.data.user_id : req.user.id;

    const us = await getUserShift(targetUserId);
    if (!us) return res.status(404).json({ message: "User not found" });
    if (!us.is_active) return res.status(400).json({ message: "User is not active" });
    if (!us.shift_id || !us.shift_active) return res.status(400).json({ message: "User has no active shift assigned" });

    const openRes = await pool.query(
      `SELECT id FROM attendance WHERE user_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1`,
      [targetUserId]
    );
    if (openRes.rowCount > 0) return res.status(409).json({ message: "User already has an OPEN attendance" });

    const now = new Date();
    const win = resolveShiftWindow(
      now,
      us.start_time,
      us.end_time,
      Number(us.grace_before_minutes ?? 15),
      Number(us.grace_after_minutes ?? 15)
    );

    if (now < win.earliest || now > win.latest) {
      return res.status(400).json({
        message: "Clock-in not allowed at this time (outside shift window).",
        shift: {
          code: us.code,
          start_time: us.start_time,
          end_time: us.end_time,
          earliest: win.earliest,
          latest: win.latest,
        },
      });
    }

    const graceAfterMs = Number(us.grace_after_minutes ?? 15) * 60_000;
    const lateMs = Math.max(0, now.getTime() - (win.scheduledStart.getTime() + graceAfterMs));
    const lateMinutes = Math.floor(lateMs / 60_000);

    const ins = await pool.query(
      `INSERT INTO attendance (user_id, shift_id, clock_in, status, scheduled_start, scheduled_end, late_minutes, paid_hours)
       VALUES ($1,$2,NOW(),'OPEN',$3,$4,$5, 8.00)
       RETURNING id, user_id, shift_id, clock_in, status, scheduled_start, scheduled_end, late_minutes, paid_hours`,
      [targetUserId, us.shift_id, win.scheduledStart, win.scheduledEnd, lateMinutes]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "CLOCK_IN",
      entity: "attendance",
      entity_id: ins.rows[0].id,
      meta: { targetUserId, shift: us.code, late_minutes: lateMinutes },
    });

    res.status(201).json({ attendance: ins.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post("/clock-out", requireAuth, async (req, res, next) => {
  try {
    const parsed = clockOutSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    let attendanceId = parsed.data.attendance_id;

    if (!attendanceId) {
      const targetUserId =
        req.user.role === "ADMIN" && parsed.data.user_id ? parsed.data.user_id : req.user.id;

      const open = await pool.query(
        `SELECT id FROM attendance WHERE user_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1`,
        [targetUserId]
      );
      if (open.rowCount === 0) return res.status(404).json({ message: "No OPEN attendance found" });
      attendanceId = open.rows[0].id;
    } else {
      if (req.user.role !== "ADMIN") {
        const owner = await pool.query(`SELECT user_id FROM attendance WHERE id = $1`, [attendanceId]);
        if (owner.rowCount === 0) return res.status(404).json({ message: "Attendance not found" });
        if (Number(owner.rows[0].user_id) !== req.user.id) return res.status(403).json({ message: "Forbidden" });
      }
    }

    const current = await pool.query(
      `SELECT id, scheduled_end FROM attendance WHERE id = $1 AND status='OPEN'`,
      [attendanceId]
    );
    if (current.rowCount === 0) return res.status(404).json({ message: "No OPEN attendance found" });

    const now = new Date();
    const scheduledEnd = current.rows[0].scheduled_end ? new Date(current.rows[0].scheduled_end) : null;
    const earlyLeaveMinutes =
      scheduledEnd && now < scheduledEnd ? Math.floor((scheduledEnd.getTime() - now.getTime()) / 60_000) : 0;

    await pool.query(
      `UPDATE breaks SET break_end = NOW()
       WHERE attendance_id = $1 AND break_end IS NULL`,
      [attendanceId]
    );

    const upd = await pool.query(
      `UPDATE attendance
       SET clock_out = NOW(),
           status = 'CLOSED',
           early_leave_minutes = $2
       WHERE id = $1 AND status = 'OPEN'
       RETURNING id, user_id, shift_id, clock_in, clock_out, total_hours, paid_hours, status,
                 scheduled_start, scheduled_end, late_minutes, early_leave_minutes`,
      [attendanceId, earlyLeaveMinutes]
    );

    if (upd.rowCount === 0) return res.status(409).json({ message: "Attendance already CLOSED or not found" });

    await auditLog({
      actor_user_id: req.user.id,
      action: "CLOCK_OUT",
      entity: "attendance",
      entity_id: upd.rows[0].id,
      meta: { early_leave_minutes: earlyLeaveMinutes },
    });

    res.json({ attendance: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.get("/today", requireAuth, async (req, res, next) => {
  try {
    const qUserId = req.query.user_id ? Number(req.query.user_id) : null;
    const targetUserId = req.user.role === "ADMIN" && qUserId ? qUserId : req.user.id;

    const result = await pool.query(
      `SELECT id, user_id, shift_id, clock_in, clock_out, total_hours, paid_hours, status,
              scheduled_start, scheduled_end, late_minutes, early_leave_minutes, created_at
       FROM attendance
       WHERE user_id = $1
         AND scheduled_start IS NOT NULL
         AND scheduled_start::date = CURRENT_DATE
       ORDER BY id DESC`,
      [targetUserId]
    );

    res.json({ attendance: result.rows });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query(`SELECT * FROM attendance WHERE id = $1`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ message: "Not found" });
    res.json({ attendance: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
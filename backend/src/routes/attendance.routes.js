import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

// --- HELPERS (Halkooda ha joogaan) ---
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

// --- ROUTES ---

router.post("/clock-in", requireAuth, async (req, res, next) => {
  try {
    const us = await getUserShift(req.user.id);
    if (!us || !us.is_active) return res.status(404).json({ message: "User or shift not active" });

    const now = new Date();
    const win = resolveShiftWindow(now, us.start_time, us.end_time, us.grace_before_minutes, us.grace_after_minutes);

    const ins = await pool.query(
      `INSERT INTO attendance (user_id, shift_id, clock_in, status, scheduled_start, scheduled_end, late_minutes, paid_hours)
       VALUES ($1, $2, NOW(), 'OPEN', $3, $4, 0, 8.00) RETURNING *`,
      [req.user.id, us.shift_id, win.scheduledStart, win.scheduledEnd]
    );

    await auditLog({ actor_user_id: req.user.id, action: "CLOCK_IN", entity: "attendance", entity_id: ins.rows[0].id });
    res.status(201).json({ attendance: ins.rows[0] });
  } catch (e) { next(e); }
});

router.post("/clock-out", requireAuth, async (req, res, next) => {
  try {
    const upd = await pool.query(
      `UPDATE attendance SET clock_out = NOW(), status = 'CLOSED' 
       WHERE user_id = $1 AND status = 'OPEN' RETURNING *`,
      [req.user.id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ message: "No OPEN attendance found" });
    res.json({ attendance: upd.rows[0] });
  } catch (e) { next(e); }
});

router.get("/today", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM attendance WHERE user_id = $1 AND created_at::date = CURRENT_DATE ORDER BY id DESC`,
      [req.user.id]
    );
    res.json({ attendance: result.rows });
  } catch (e) { next(e); }
});

export default router;
import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

function payrollWindowByFriday(today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0..6
  const diffToFri = (dow - 5 + 7) % 7;
  const weekEnd = new Date(d);
  weekEnd.setDate(weekEnd.getDate() - diffToFri);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  return { weekStart, weekEnd };
}
function toISODate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

router.get("/me/today", requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT id, user_id, shift_id, clock_in, clock_out, total_hours, paid_hours, status, scheduled_start, scheduled_end, created_at
      FROM attendance
      WHERE user_id = $1
        AND scheduled_start IS NOT NULL
        AND scheduled_start::date = CURRENT_DATE
      ORDER BY id DESC
      `,
      [req.user.id]
    );
    res.json({ today: r.rows });
  } catch (e) {
    next(e);
  }
});

router.get("/me/weekly", requireAuth, async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = payrollWindowByFriday(new Date());
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);

    const summary = await pool.query(
      `
      WITH att AS (
        SELECT
          COUNT(*) FILTER (WHERE status='CLOSED') AS shifts_closed,
          COALESCE(SUM(total_hours),0) AS worked_net_hours,
          COALESCE(SUM(paid_hours),0) AS paid_hours
        FROM attendance
        WHERE user_id = $1
          AND scheduled_start IS NOT NULL
          AND scheduled_start::date BETWEEN $2::date AND $3::date
          AND status='CLOSED'
      ),
      abs AS (
        SELECT COUNT(*) AS absent_days
        FROM absences
        WHERE user_id = $1
          AND work_date BETWEEN $2::date AND $3::date
      ),
      pay AS (
        SELECT COALESCE(SUM(p.total_pay),0) AS total_pay
        FROM payroll p
        JOIN attendance a ON a.id = p.attendance_id
        WHERE a.user_id = $1
          AND a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $2::date AND $3::date
          AND a.status='CLOSED'
      )
      SELECT
        (SELECT shifts_closed FROM att) AS shifts_closed,
        (SELECT worked_net_hours FROM att) AS worked_net_hours,
        (SELECT paid_hours FROM att) AS paid_hours,
        (SELECT absent_days FROM abs) AS absent_days,
        (SELECT total_pay FROM pay) AS total_pay
      `,
      [req.user.id, weekStartISO, weekEndISO]
    );

    const attendance = await pool.query(
      `
      SELECT id, shift_id, clock_in, clock_out, total_hours, paid_hours, status, scheduled_start, scheduled_end
      FROM attendance
      WHERE user_id = $1
        AND scheduled_start IS NOT NULL
        AND scheduled_start::date BETWEEN $2::date AND $3::date
      ORDER BY id DESC
      `,
      [req.user.id, weekStartISO, weekEndISO]
    );

    res.json({
      week_start: weekStartISO,
      week_end: weekEndISO,
      cutoff_day: "FRI",
      summary: summary.rows[0],
      attendance: attendance.rows,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
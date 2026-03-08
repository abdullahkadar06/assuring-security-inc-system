import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

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
      SELECT
        id,
        user_id,
        shift_id,
        clock_in,
        clock_out,
        total_hours,
        paid_hours,
        status,
        scheduled_start,
        scheduled_end,
        created_at
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

    // summary: payroll table kuma tiirsana si 500 looga baxo
    const summary = await pool.query(
      `
      WITH att AS (
        SELECT
          COUNT(*) FILTER (WHERE a.status = 'CLOSED') AS shifts_closed,
          COALESCE(SUM(a.total_hours), 0) AS worked_net_hours,
          COALESCE(SUM(a.paid_hours), 0) AS paid_hours,
          COALESCE(SUM(a.paid_hours * COALESCE(u.hourly_rate, 0)), 0) AS total_pay
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE a.user_id = $1
          AND a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $2::date AND $3::date
          AND a.status = 'CLOSED'
      ),
      abs AS (
        SELECT COUNT(*) AS absent_days
        FROM absences
        WHERE user_id = $1
          AND work_date BETWEEN $2::date AND $3::date
      )
      SELECT
        COALESCE((SELECT shifts_closed FROM att), 0) AS shifts_closed,
        COALESCE((SELECT worked_net_hours FROM att), 0) AS worked_net_hours,
        COALESCE((SELECT paid_hours FROM att), 0) AS paid_hours,
        COALESCE((SELECT absent_days FROM abs), 0) AS absent_days,
        COALESCE((SELECT total_pay FROM att), 0) AS total_pay
      `,
      [req.user.id, weekStartISO, weekEndISO]
    );

    const attendance = await pool.query(
      `
      SELECT
        id,
        shift_id,
        clock_in,
        clock_out,
        total_hours,
        paid_hours,
        status,
        scheduled_start,
        scheduled_end
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
      summary: summary.rows[0] || {
        shifts_closed: 0,
        worked_net_hours: 0,
        paid_hours: 0,
        absent_days: 0,
        total_pay: 0,
      },
      attendance: attendance.rows,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * ADMIN OVERVIEW
 */
router.get("/admin/overview", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const overview = await pool.query(
      `
      WITH staff AS (
        SELECT COUNT(*)::int AS total_staff
        FROM users
        WHERE is_active = TRUE
      ),
      today_att AS (
        SELECT
          COUNT(DISTINCT user_id) FILTER (WHERE status = 'OPEN' OR status = 'CLOSED')::int AS present_today,
          COUNT(DISTINCT user_id) FILTER (WHERE late_minutes > 0)::int AS late_today
        FROM attendance
        WHERE scheduled_start IS NOT NULL
          AND scheduled_start::date = CURRENT_DATE
      ),
      today_abs AS (
        SELECT COUNT(*)::int AS absent_today
        FROM absences
        WHERE work_date = CURRENT_DATE
      )
      SELECT
        (SELECT total_staff FROM staff) AS total_staff,
        COALESCE((SELECT present_today FROM today_att), 0) AS present,
        COALESCE((SELECT absent_today FROM today_abs), 0) AS absent,
        COALESCE((SELECT late_today FROM today_att), 0) AS late
      `
    );

    const row = overview.rows[0] || {
      total_staff: 0,
      present: 0,
      absent: 0,
      late: 0,
    };

    res.json({
      summary: row,
      distribution: [
        { name: "Present", value: Number(row.present || 0) },
        { name: "Absent", value: Number(row.absent || 0) },
        { name: "Late", value: Number(row.late || 0) },
      ],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * ADMIN WEEKLY
 */
router.get("/admin/weekly", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = payrollWindowByFriday(new Date());
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);

    const summary = await pool.query(
      `
      WITH att AS (
        SELECT
          COALESCE(SUM(a.total_hours), 0) AS worked_hours,
          COALESCE(SUM(a.paid_hours), 0) AS paid_hours,
          COUNT(*) FILTER (WHERE a.late_minutes > 0) AS late_count,
          COALESCE(SUM(a.paid_hours * COALESCE(u.hourly_rate, 0)), 0) AS total_pay
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
      ),
      abs AS (
        SELECT COUNT(*) AS absent_days
        FROM absences
        WHERE work_date BETWEEN $1::date AND $2::date
      )
      SELECT
        COALESCE((SELECT worked_hours FROM att), 0) AS worked_hours,
        COALESCE((SELECT paid_hours FROM att), 0) AS paid_hours,
        COALESCE((SELECT late_count FROM att), 0) AS late_count,
        COALESCE((SELECT absent_days FROM abs), 0) AS absent_days,
        COALESCE((SELECT total_pay FROM att), 0) AS total_pay
      `,
      [weekStartISO, weekEndISO]
    );

    res.json({
      week_start: weekStartISO,
      week_end: weekEndISO,
      summary: summary.rows[0] || {
        worked_hours: 0,
        paid_hours: 0,
        late_count: 0,
        absent_days: 0,
        total_pay: 0,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
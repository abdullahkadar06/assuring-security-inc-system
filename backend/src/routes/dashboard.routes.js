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
        a.created_at,
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
        AND a.scheduled_start IS NOT NULL
        AND a.scheduled_start::date = CURRENT_DATE
      GROUP BY a.id
      ORDER BY a.id DESC
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
      WITH att_base AS (
        SELECT
          a.id,
          a.user_id,
          a.status,
          a.scheduled_start,
          a.clock_in,
          a.clock_out,
          COALESCE(u.hourly_rate, 0) AS hourly_rate,
          COALESCE(
            SUM(
              EXTRACT(
                EPOCH FROM (
                  COALESCE(b.break_end, NOW()) - b.break_start
                )
              )
            ),
            0
          ) AS break_seconds
        FROM attendance a
        JOIN users u
          ON u.id = a.user_id
        LEFT JOIN breaks b
          ON b.attendance_id = a.id
         AND b.break_start IS NOT NULL
        WHERE a.user_id = $1
          AND a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $2::date AND $3::date
        GROUP BY a.id, u.hourly_rate
      ),
      att AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'CLOSED') AS shifts_closed,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0
                ELSE 0
              END
            ),
            0
          ) AS worked_net_hours,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0
                ELSE 0
              END
            ),
            0
          ) AS paid_hours,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED'
                  THEN break_seconds / 60.0
                ELSE 0
              END
            ),
            0
          ) AS break_minutes,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN (GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0) * hourly_rate
                ELSE 0
              END
            ),
            0
          ) AS total_pay
        FROM att_base
      ),
      abs AS (
        SELECT COUNT(*) AS absent_days
        FROM absences
        WHERE user_id = $1
          AND work_date BETWEEN $2::date AND $3::date
      )
      SELECT
        COALESCE((SELECT shifts_closed FROM att), 0) AS shifts_closed,
        ROUND(COALESCE((SELECT worked_net_hours FROM att), 0)::numeric, 2) AS worked_net_hours,
        ROUND(COALESCE((SELECT paid_hours FROM att), 0)::numeric, 2) AS paid_hours,
        ROUND(COALESCE((SELECT break_minutes FROM att), 0)::numeric, 2) AS break_minutes,
        COALESCE((SELECT absent_days FROM abs), 0) AS absent_days,
        ROUND(COALESCE((SELECT total_pay FROM att), 0)::numeric, 2) AS total_pay
      `,
      [req.user.id, weekStartISO, weekEndISO]
    );

    const attendance = await pool.query(
      `
      SELECT
        a.id,
        a.shift_id,
        a.clock_in,
        a.clock_out,
        a.total_hours,
        a.paid_hours,
        a.status,
        a.scheduled_start,
        a.scheduled_end,
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
        AND a.scheduled_start IS NOT NULL
        AND a.scheduled_start::date BETWEEN $2::date AND $3::date
      GROUP BY a.id
      ORDER BY a.id DESC
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
        break_minutes: 0,
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
router.get(
  "/admin/overview",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
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
  }
);

/**
 * ADMIN WEEKLY
 */
router.get(
  "/admin/weekly",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const { weekStart, weekEnd } = payrollWindowByFriday(new Date());
      const weekStartISO = toISODate(weekStart);
      const weekEndISO = toISODate(weekEnd);

      const summary = await pool.query(
        `
      WITH att_base AS (
        SELECT
          a.id,
          a.user_id,
          a.status,
          a.scheduled_start,
          a.clock_in,
          a.clock_out,
          COALESCE(u.hourly_rate, 0) AS hourly_rate,
          COALESCE(
            SUM(
              EXTRACT(
                EPOCH FROM (
                  COALESCE(b.break_end, NOW()) - b.break_start
                )
              )
            ),
            0
          ) AS break_seconds,
          a.late_minutes
        FROM attendance a
        JOIN users u
          ON u.id = a.user_id
        LEFT JOIN breaks b
          ON b.attendance_id = a.id
         AND b.break_start IS NOT NULL
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
        GROUP BY a.id, u.hourly_rate
      ),
      att AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0
                ELSE 0
              END
            ),
            0
          ) AS worked_hours,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0
                ELSE 0
              END
            ),
            0
          ) AS paid_hours,
          COUNT(*) FILTER (WHERE late_minutes > 0) AS late_count,
          COALESCE(
            SUM(
              CASE
                WHEN status = 'CLOSED' AND clock_in IS NOT NULL AND clock_out IS NOT NULL
                  THEN (GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in)) - break_seconds, 0) / 3600.0) * hourly_rate
                ELSE 0
              END
            ),
            0
          ) AS total_pay
        FROM att_base
      ),
      abs AS (
        SELECT COUNT(*) AS absent_days
        FROM absences
        WHERE work_date BETWEEN $1::date AND $2::date
      )
      SELECT
        ROUND(COALESCE((SELECT worked_hours FROM att), 0)::numeric, 2) AS worked_hours,
        ROUND(COALESCE((SELECT paid_hours FROM att), 0)::numeric, 2) AS paid_hours,
        COALESCE((SELECT late_count FROM att), 0) AS late_count,
        COALESCE((SELECT absent_days FROM abs), 0) AS absent_days,
        ROUND(COALESCE((SELECT total_pay FROM att), 0)::numeric, 2) AS total_pay
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
  }
);

export default router;
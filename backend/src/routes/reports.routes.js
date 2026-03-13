import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const FINALIZED_INCLUDED_STATUSES = ["CLOSED", "AUTO_CLOSED"];

function payrollWindowByFriday(today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  const dow = d.getDay();
  const diffToFri = (dow - 5 + 7) % 7;

  const weekEnd = new Date(d);
  weekEnd.setDate(weekEnd.getDate() - diffToFri);

  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);

  return { weekStart, weekEnd };
}

function toLocalISODate(d) {
  const x = new Date(d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const finalizeSchema = z.object({
  week_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function generateAbsences({ weekStartISO, weekEndISO }) {
  await pool.query(
    `
    INSERT INTO absences (user_id, shift_id, work_date, reason)
    SELECT u.id, u.shift_id, d::date AS work_date, 'AUTO_ABSENT'
    FROM (SELECT id, shift_id FROM users WHERE is_active = TRUE) u
    CROSS JOIN generate_series($1::date, $2::date, interval '1 day') d
    LEFT JOIN attendance a
      ON a.user_id = u.id
     AND a.scheduled_start IS NOT NULL
     AND a.scheduled_start::date = d::date
     AND a.status = ANY($3::text[])
    WHERE a.id IS NULL
    ON CONFLICT (user_id, work_date) DO NOTHING
    `,
    [weekStartISO, weekEndISO, FINALIZED_INCLUDED_STATUSES]
  );
}

router.post(
  "/finalize-week",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const parsed = finalizeSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid payload",
          errors: parsed.error.flatten(),
        });
      }

      let weekStart, weekEnd;

      if (parsed.data.week_end) {
        const we = new Date(`${parsed.data.week_end}T00:00:00`);
        weekEnd = we;
        weekStart = new Date(we);
        weekStart.setDate(weekStart.getDate() - 6);
      } else {
        ({ weekStart, weekEnd } = payrollWindowByFriday(new Date()));
      }

      const weekStartISO = toLocalISODate(weekStart);
      const weekEndISO = toLocalISODate(weekEnd);

      await pool.query("BEGIN");

      await generateAbsences({ weekStartISO, weekEndISO });

      await pool.query(
        `
        INSERT INTO weekly_runs (week_start, week_end, cutoff_day, finalized_by)
        VALUES ($1::date, $2::date, 'FRI', $3)
        ON CONFLICT (week_start, week_end)
        DO UPDATE SET finalized_by = EXCLUDED.finalized_by
        `,
        [weekStartISO, weekEndISO, req.user.id]
      );

      const summary = await pool.query(
        `
        WITH att AS (
          SELECT
            a.user_id,
            COUNT(*) FILTER (WHERE a.status = ANY($3::text[])) AS shifts_closed,
            COALESCE(
              SUM(a.total_hours) FILTER (WHERE a.status = ANY($3::text[])),
              0
            ) AS worked_net_hours,
            COALESCE(
              SUM(a.paid_hours) FILTER (WHERE a.status = ANY($3::text[])),
              0
            ) AS paid_hours
          FROM attendance a
          WHERE a.scheduled_start IS NOT NULL
            AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          GROUP BY a.user_id
        ),
        abs AS (
          SELECT user_id, COUNT(*) AS absent_days
          FROM absences
          WHERE work_date BETWEEN $1::date AND $2::date
          GROUP BY user_id
        ),
        pay AS (
          SELECT
            a.user_id,
            COALESCE(
              SUM(
                COALESCE(
                  p.total_pay,
                  ROUND((COALESCE(a.paid_hours, 0) * COALESCE(u.hourly_rate, 0))::numeric, 2)
                )
              ),
              0
            ) AS total_pay
          FROM attendance a
          JOIN users u ON u.id = a.user_id
          LEFT JOIN payroll p ON p.attendance_id = a.id
          WHERE a.scheduled_start IS NOT NULL
            AND a.scheduled_start::date BETWEEN $1::date AND $2::date
            AND a.status = ANY($3::text[])
          GROUP BY a.user_id
        )
        SELECT
          u.id AS user_id,
          u.full_name,
          u.email,
          u.role,
          COALESCE(att.shifts_closed, 0) AS shifts_closed,
          ROUND(COALESCE(att.worked_net_hours, 0)::numeric, 2) AS worked_net_hours,
          ROUND(COALESCE(att.paid_hours, 0)::numeric, 2) AS paid_hours,
          COALESCE(abs.absent_days, 0) AS absent_days,
          ROUND(COALESCE(pay.total_pay, 0)::numeric, 2) AS total_pay
        FROM users u
        LEFT JOIN att ON att.user_id = u.id
        LEFT JOIN abs ON abs.user_id = u.id
        LEFT JOIN pay ON pay.user_id = u.id
        WHERE u.is_active = TRUE
        ORDER BY u.id ASC
        `,
        [weekStartISO, weekEndISO, FINALIZED_INCLUDED_STATUSES]
      );

      await pool.query("COMMIT");

      return res.json({
        week_start: weekStartISO,
        week_end: weekEndISO,
        cutoff_day: "FRI",
        summary: summary.rows,
      });
    } catch (e) {
      try {
        await pool.query("ROLLBACK");
      } catch {}
      next(e);
    }
  }
);

router.get(
  "/weekly",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const weekEndParam = req.query.week_end ? String(req.query.week_end) : null;

      let weekStart, weekEnd;
      if (weekEndParam) {
        weekEnd = new Date(`${weekEndParam}T00:00:00`);
        weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
      } else {
        ({ weekStart, weekEnd } = payrollWindowByFriday(new Date()));
      }

      const weekStartISO = toLocalISODate(weekStart);
      const weekEndISO = toLocalISODate(weekEnd);

      const summary = await pool.query(
        `
        WITH att AS (
          SELECT
            a.user_id,
            COUNT(*) FILTER (WHERE a.status = ANY($3::text[])) AS shifts_closed,
            COALESCE(
              SUM(a.total_hours) FILTER (WHERE a.status = ANY($3::text[])),
              0
            ) AS worked_net_hours,
            COALESCE(
              SUM(a.paid_hours) FILTER (WHERE a.status = ANY($3::text[])),
              0
            ) AS paid_hours
          FROM attendance a
          WHERE a.scheduled_start IS NOT NULL
            AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          GROUP BY a.user_id
        ),
        abs AS (
          SELECT user_id, COUNT(*) AS absent_days
          FROM absences
          WHERE work_date BETWEEN $1::date AND $2::date
          GROUP BY user_id
        ),
        pay AS (
          SELECT
            a.user_id,
            COALESCE(
              SUM(
                COALESCE(
                  p.total_pay,
                  ROUND((COALESCE(a.paid_hours, 0) * COALESCE(u.hourly_rate, 0))::numeric, 2)
                )
              ),
              0
            ) AS total_pay
          FROM attendance a
          JOIN users u ON u.id = a.user_id
          LEFT JOIN payroll p ON p.attendance_id = a.id
          WHERE a.scheduled_start IS NOT NULL
            AND a.scheduled_start::date BETWEEN $1::date AND $2::date
            AND a.status = ANY($3::text[])
          GROUP BY a.user_id
        )
        SELECT
          u.id AS user_id,
          u.full_name,
          u.email,
          u.role,
          COALESCE(att.shifts_closed, 0) AS shifts_closed,
          ROUND(COALESCE(att.worked_net_hours, 0)::numeric, 2) AS worked_net_hours,
          ROUND(COALESCE(att.paid_hours, 0)::numeric, 2) AS paid_hours,
          COALESCE(abs.absent_days, 0) AS absent_days,
          ROUND(COALESCE(pay.total_pay, 0)::numeric, 2) AS total_pay
        FROM users u
        LEFT JOIN att ON att.user_id = u.id
        LEFT JOIN abs ON abs.user_id = u.id
        LEFT JOIN pay ON pay.user_id = u.id
        WHERE u.is_active = TRUE
        ORDER BY u.id ASC
        `,
        [weekStartISO, weekEndISO, FINALIZED_INCLUDED_STATUSES]
      );

      res.json({
        week_start: weekStartISO,
        week_end: weekEndISO,
        cutoff_day: "FRI",
        summary: summary.rows,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
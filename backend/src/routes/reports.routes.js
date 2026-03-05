import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/**
 * Friday cutoff payroll window:
 * Week = SAT -> FRI (7 days)
 * week_end = most recent Friday (including today if Friday)
 * week_start = week_end - 6 days
 */
function payrollWindowByFriday(today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  // JS: getDay() 0=Sun..6=Sat
  const dow = d.getDay();
  // want Friday = 5
  const diffToFri = (dow - 5 + 7) % 7; // how many days since last Friday
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

const finalizeSchema = z.object({
  week_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // optional override
});

/**
 * INTERNAL: ensure absences for window (SAT->FRI)
 * Absent rule:
 * - If user has no attendance (any) with scheduled_start::date = work_date within window
 * - then insert absence (paid=0 by payroll logic because no attendance row => no payroll)
 */
async function generateAbsences({ weekStartISO, weekEndISO }) {
  // Get all active users (employees + admins; if you only want EMPLOYEE, filter role)
  const users = await pool.query(
    `SELECT id, shift_id
     FROM users
     WHERE is_active = TRUE`
  );

  // Generate dates in window in SQL
  // Insert absences for missing attendance
  // We use scheduled_start::date because night shift crosses midnight.
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
    WHERE a.id IS NULL
    ON CONFLICT (user_id, work_date) DO NOTHING
    `,
    [weekStartISO, weekEndISO]
  );
}

/**
 * POST /api/reports/finalize-week  (ADMIN)
 * - determines SAT->FRI window (default)
 * - auto-creates absences
 * - stores weekly_runs
 * - returns summary per user
 */
router.post("/finalize-week", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = finalizeSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    let weekStart, weekEnd;

    if (parsed.data.week_end) {
      const we = new Date(parsed.data.week_end + "T00:00:00");
      // treat provided date as week_end (expected Friday)
      weekEnd = we;
      weekStart = new Date(we);
      weekStart.setDate(weekStart.getDate() - 6);
    } else {
      ({ weekStart, weekEnd } = payrollWindowByFriday(new Date()));
    }

    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);

    await pool.query("BEGIN");

    // 1) generate absences
    await generateAbsences({ weekStartISO, weekEndISO });

    // 2) store weekly run (idempotent)
    await pool.query(
      `
      INSERT INTO weekly_runs (week_start, week_end, cutoff_day, finalized_by)
      VALUES ($1::date, $2::date, 'FRI', $3)
      ON CONFLICT (week_start, week_end)
      DO UPDATE SET finalized_by = EXCLUDED.finalized_by
      `,
      [weekStartISO, weekEndISO, req.user.id]
    );

    // 3) summary per user (attendance + payroll in window)
    // attendance work_date anchored by scheduled_start::date (best for night shift)
    const summary = await pool.query(
      `
      WITH att AS (
        SELECT
          a.user_id,
          COUNT(*) FILTER (WHERE a.status='CLOSED') AS shifts_closed,
          COALESCE(SUM(a.total_hours),0) AS worked_net_hours,
          COALESCE(SUM(a.paid_hours),0) AS paid_hours
        FROM attendance a
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          AND a.status='CLOSED'
        GROUP BY a.user_id
      ),
      abs AS (
        SELECT user_id, COUNT(*) AS absent_days
        FROM absences
        WHERE work_date BETWEEN $1::date AND $2::date
        GROUP BY user_id
      ),
      pay AS (
        SELECT p.user_id, COALESCE(SUM(p.total_pay),0) AS total_pay
        FROM payroll p
        JOIN attendance a ON a.id = p.attendance_id
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          AND a.status='CLOSED'
        GROUP BY p.user_id
      )
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.role,
        COALESCE(att.shifts_closed,0) AS shifts_closed,
        COALESCE(att.worked_net_hours,0) AS worked_net_hours,
        COALESCE(att.paid_hours,0) AS paid_hours,
        COALESCE(abs.absent_days,0) AS absent_days,
        COALESCE(pay.total_pay,0) AS total_pay
      FROM users u
      LEFT JOIN att ON att.user_id = u.id
      LEFT JOIN abs ON abs.user_id = u.id
      LEFT JOIN pay ON pay.user_id = u.id
      WHERE u.is_active = TRUE
      ORDER BY u.id ASC
      `,
      [weekStartISO, weekEndISO]
    );

    await pool.query("COMMIT");

    return res.json({
      week_start: weekStartISO,
      week_end: weekEndISO,
      cutoff_day: "FRI",
      summary: summary.rows,
    });
  } catch (e) {
    try { await pool.query("ROLLBACK"); } catch {}
    next(e);
  }
});

/**
 * GET /api/reports/weekly?week_end=YYYY-MM-DD  (ADMIN)
 * - returns saved weekly view for given week_end or default latest Friday
 */
router.get("/weekly", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const weekEndParam = req.query.week_end ? String(req.query.week_end) : null;

    let weekStart, weekEnd;
    if (weekEndParam) {
      weekEnd = new Date(weekEndParam + "T00:00:00");
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
    } else {
      ({ weekStart, weekEnd } = payrollWindowByFriday(new Date()));
    }

    const weekStartISO = toISODate(weekStart);
    const weekEndISO = toISODate(weekEnd);

    // show summary without re-finalizing
    const summary = await pool.query(
      `
      WITH att AS (
        SELECT
          a.user_id,
          COUNT(*) FILTER (WHERE a.status='CLOSED') AS shifts_closed,
          COALESCE(SUM(a.total_hours),0) AS worked_net_hours,
          COALESCE(SUM(a.paid_hours),0) AS paid_hours
        FROM attendance a
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          AND a.status='CLOSED'
        GROUP BY a.user_id
      ),
      abs AS (
        SELECT user_id, COUNT(*) AS absent_days
        FROM absences
        WHERE work_date BETWEEN $1::date AND $2::date
        GROUP BY user_id
      ),
      pay AS (
        SELECT p.user_id, COALESCE(SUM(p.total_pay),0) AS total_pay
        FROM payroll p
        JOIN attendance a ON a.id = p.attendance_id
        WHERE a.scheduled_start IS NOT NULL
          AND a.scheduled_start::date BETWEEN $1::date AND $2::date
          AND a.status='CLOSED'
        GROUP BY p.user_id
      )
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.role,
        COALESCE(att.shifts_closed,0) AS shifts_closed,
        COALESCE(att.worked_net_hours,0) AS worked_net_hours,
        COALESCE(att.paid_hours,0) AS paid_hours,
        COALESCE(abs.absent_days,0) AS absent_days,
        COALESCE(pay.total_pay,0) AS total_pay
      FROM users u
      LEFT JOIN att ON att.user_id = u.id
      LEFT JOIN abs ON abs.user_id = u.id
      LEFT JOIN pay ON pay.user_id = u.id
      WHERE u.is_active = TRUE
      ORDER BY u.id ASC
      `,
      [weekStartISO, weekEndISO]
    );

    res.json({ week_start: weekStartISO, week_end: weekEndISO, cutoff_day: "FRI", summary: summary.rows });
  } catch (e) {
    next(e);
  }
});

export default router;
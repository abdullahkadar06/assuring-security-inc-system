import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

const WEEKLY_INCLUDED_STATUSES = ["OPEN", "CLOSED", "AUTO_CLOSED"];

function payrollWindowByFriday(today = new Date()) {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);

  const dow = d.getDay(); // 0=Sun ... 6=Sat
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

function minDate(a, b) {
  return a.getTime() <= b.getTime() ? a : b;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function makeDate(baseDate, hour, minute = 0, second = 0) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute,
    second,
    0
  );
}

function getShiftKind(userShift) {
  const code = String(userShift?.code || "").toUpperCase();
  const name = String(userShift?.name || "").toUpperCase();

  if (code.includes("NIGHT") || name.includes("NIGHT")) {
    return "NIGHT";
  }

  return "MORNING";
}

function resolvePolicyForAnchorDate(anchorDate, shiftKind) {
  const anchor = startOfDay(anchorDate);
  const dow = anchor.getDay(); // 0=Sun ... 6=Sat

  if (shiftKind === "MORNING") {
    return {
      scheduledStart: makeDate(anchor, 8, 0, 0),
      scheduledEnd: makeDate(anchor, 16, 0, 0),
    };
  }

  // Saturday night => 23:00 -> next day 07:00
  if (dow === 6) {
    return {
      scheduledStart: makeDate(anchor, 23, 0, 0),
      scheduledEnd: makeDate(addDays(anchor, 1), 7, 0, 0),
    };
  }

  // Sunday night => 23:00 -> next day 08:00
  if (dow === 0) {
    return {
      scheduledStart: makeDate(anchor, 23, 0, 0),
      scheduledEnd: makeDate(addDays(anchor, 1), 8, 0, 0),
    };
  }

  // Other nights => 00:00 -> 08:00
  return {
    scheduledStart: makeDate(anchor, 0, 0, 0),
    scheduledEnd: makeDate(anchor, 8, 0, 0),
  };
}

async function getUserShiftMeta(userId) {
  const r = await pool.query(
    `SELECT
        u.id,
        u.shift_id,
        u.hourly_rate,
        s.code,
        s.name,
        s.grace_after_minutes,
        s.is_active
     FROM users u
     LEFT JOIN shifts s ON s.id = u.shift_id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  return r.rowCount ? r.rows[0] : null;
}

async function getAttendanceDatesForUser(userId, fromISO, toISO) {
  const r = await pool.query(
    `SELECT DISTINCT a.scheduled_start::date AS work_date
     FROM attendance a
     WHERE a.user_id = $1
       AND a.scheduled_start IS NOT NULL
       AND a.scheduled_start::date BETWEEN $2::date AND $3::date`,
    [userId, fromISO, toISO]
  );

  return new Set(
    r.rows.map((row) => {
      const d = new Date(row.work_date);
      return toLocalISODate(d);
    })
  );
}

async function getLiveAbsentDaysForUser(userId, weekStart, effectiveEnd) {
  const shiftMeta = await getUserShiftMeta(userId);

  if (!shiftMeta || !shiftMeta.shift_id || !shiftMeta.is_active) {
    return 0;
  }

  const shiftKind = getShiftKind(shiftMeta);
  const graceAfter = Number(shiftMeta.grace_after_minutes ?? 15);
  const now = new Date();

  const weekStartISO = toLocalISODate(weekStart);
  const effectiveEndISO = toLocalISODate(effectiveEnd);

  const attendanceDates = await getAttendanceDatesForUser(
    userId,
    weekStartISO,
    effectiveEndISO
  );

  let absentDays = 0;
  let cursor = startOfDay(weekStart);
  const end = startOfDay(effectiveEnd);

  while (cursor.getTime() <= end.getTime()) {
    const policy = resolvePolicyForAnchorDate(cursor, shiftKind);
    const latestAllowed = new Date(
      policy.scheduledStart.getTime() + graceAfter * 60 * 1000
    );

    const anchorISO = toLocalISODate(cursor);

    if (now.getTime() > latestAllowed.getTime()) {
      if (!attendanceDates.has(anchorISO)) {
        absentDays += 1;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return absentDays;
}

async function getLiveAbsentDaysForAllUsers(weekStart, effectiveEnd) {
  const usersRes = await pool.query(
    `SELECT
        u.id,
        u.shift_id,
        s.code,
        s.name,
        s.grace_after_minutes,
        s.is_active
     FROM users u
     LEFT JOIN shifts s ON s.id = u.shift_id
     WHERE u.is_active = TRUE`
  );

  let absentDays = 0;

  for (const user of usersRes.rows) {
    if (!user.shift_id || !user.is_active) continue;

    const userAbsentDays = await getLiveAbsentDaysForUser(
      user.id,
      weekStart,
      effectiveEnd
    );

    absentDays += Number(userAbsentDays || 0);
  }

  return absentDays;
}

router.get("/me/today", requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
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
         AND (
           a.created_at::date = CURRENT_DATE
           OR a.scheduled_start::date = CURRENT_DATE
         )
       GROUP BY a.id
       ORDER BY a.id DESC`,
      [req.user.id]
    );

    res.json({ today: r.rows });
  } catch (e) {
    next(e);
  }
});

router.get("/me/weekly", requireAuth, async (req, res, next) => {
  try {
    const today = new Date();
    const { weekStart, weekEnd } = payrollWindowByFriday(today);
    const effectiveEnd = minDate(today, weekEnd);

    const weekStartISO = toLocalISODate(weekStart);
    const effectiveEndISO = toLocalISODate(effectiveEnd);
    const weekEndISO = toLocalISODate(weekEnd);

    const summaryQuery = await pool.query(
      `WITH att_base AS (
         SELECT
           a.id,
           a.user_id,
           a.status,
           a.scheduled_start,
           a.clock_in,
           a.clock_out,
           a.total_hours,
           a.paid_hours,
           COALESCE(
             p.total_pay,
             ROUND((COALESCE(a.paid_hours, 0) * COALESCE(u.hourly_rate, 0))::numeric, 2)
           ) AS total_pay,
           COALESCE(
             (
               SELECT SUM(
                 EXTRACT(EPOCH FROM (COALESCE(b.break_end, NOW()) - b.break_start))
               )
               FROM breaks b
               WHERE b.attendance_id = a.id
                 AND b.break_start IS NOT NULL
             ),
             0
           ) AS break_seconds
         FROM attendance a
         JOIN users u
           ON u.id = a.user_id
         LEFT JOIN payroll p
           ON p.attendance_id = a.id
         WHERE a.user_id = $1
           AND a.scheduled_start IS NOT NULL
           AND a.scheduled_start::date BETWEEN $2::date AND $3::date
       )
       SELECT
         COUNT(*) FILTER (WHERE status = ANY($4::text[])) AS shifts_count,
         ROUND(
           COALESCE(
             SUM(total_hours) FILTER (WHERE status = ANY($4::text[])),
             0
           )::numeric,
           2
         ) AS worked_net_hours,
         ROUND(
           COALESCE(
             SUM(paid_hours) FILTER (WHERE status = ANY($4::text[])),
             0
           )::numeric,
           2
         ) AS paid_hours,
         ROUND(
           COALESCE(
             SUM(break_seconds) FILTER (WHERE status = ANY($4::text[])) / 60.0,
             0
           )::numeric,
           2
         ) AS break_minutes,
         ROUND(
           COALESCE(
             SUM(total_pay) FILTER (WHERE status = ANY($4::text[])),
             0
           )::numeric,
           2
         ) AS total_pay
       FROM att_base`,
      [req.user.id, weekStartISO, effectiveEndISO, WEEKLY_INCLUDED_STATUSES]
    );

    const attendance = await pool.query(
      `SELECT
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
       ORDER BY a.id DESC`,
      [req.user.id, weekStartISO, effectiveEndISO]
    );

    const absentDays = await getLiveAbsentDaysForUser(
      req.user.id,
      weekStart,
      effectiveEnd
    );

    const base = summaryQuery.rows[0] || {};

    res.json({
      week_start: weekStartISO,
      week_end: weekEndISO,
      summary_end: effectiveEndISO,
      cutoff_day: "FRI",
      summary: {
        shifts_count: Number(base.shifts_count ?? 0),
        worked_net_hours: Number(base.worked_net_hours ?? 0),
        paid_hours: Number(base.paid_hours ?? 0),
        break_minutes: Number(base.break_minutes ?? 0),
        absent_days: Number(absentDays ?? 0),
        total_pay: Number(base.total_pay ?? 0),
      },
      attendance: attendance.rows,
    });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/admin/overview",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const liveAbsentToday = await getLiveAbsentDaysForAllUsers(
        startOfDay(new Date()),
        startOfDay(new Date())
      );

      const overview = await pool.query(
        `WITH staff AS (
           SELECT COUNT(*)::int AS total_staff
           FROM users
           WHERE is_active = TRUE
         ),
         today_att AS (
           SELECT
             COUNT(DISTINCT user_id) FILTER (
               WHERE status IN ('OPEN', 'CLOSED', 'AUTO_CLOSED')
             )::int AS present_today,
             COUNT(DISTINCT user_id) FILTER (
               WHERE late_minutes > 0
             )::int AS late_today
           FROM attendance
           WHERE scheduled_start IS NOT NULL
             AND scheduled_start::date = CURRENT_DATE
         )
         SELECT
           (SELECT total_staff FROM staff) AS total_staff,
           COALESCE((SELECT present_today FROM today_att), 0) AS present,
           COALESCE((SELECT late_today FROM today_att), 0) AS late`
      );

      const row = overview.rows[0] || {
        total_staff: 0,
        present: 0,
        late: 0,
      };

      res.json({
        summary: {
          total_staff: Number(row.total_staff || 0),
          present: Number(row.present || 0),
          absent: Number(liveAbsentToday || 0),
          late: Number(row.late || 0),
        },
        distribution: [
          { name: "Present", value: Number(row.present || 0) },
          { name: "Absent", value: Number(liveAbsentToday || 0) },
          { name: "Late", value: Number(row.late || 0) },
        ],
      });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  "/admin/weekly",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const today = new Date();
      const { weekStart, weekEnd } = payrollWindowByFriday(today);
      const effectiveEnd = minDate(today, weekEnd);

      const weekStartISO = toLocalISODate(weekStart);
      const effectiveEndISO = toLocalISODate(effectiveEnd);
      const weekEndISO = toLocalISODate(weekEnd);

      const summary = await pool.query(
        `WITH att_base AS (
           SELECT
             a.id,
             a.user_id,
             a.status,
             a.scheduled_start,
             a.clock_in,
             a.clock_out,
             a.total_hours,
             a.paid_hours,
             a.late_minutes,
             COALESCE(
               p.total_pay,
               ROUND((COALESCE(a.paid_hours, 0) * COALESCE(u.hourly_rate, 0))::numeric, 2)
             ) AS total_pay
           FROM attendance a
           JOIN users u
             ON u.id = a.user_id
           LEFT JOIN payroll p
             ON p.attendance_id = a.id
           WHERE a.scheduled_start IS NOT NULL
             AND a.scheduled_start::date BETWEEN $1::date AND $2::date
         )
         SELECT
           ROUND(
             COALESCE(
               SUM(total_hours) FILTER (WHERE status = ANY($3::text[])),
               0
             )::numeric,
             2
           ) AS worked_hours,
           ROUND(
             COALESCE(
               SUM(paid_hours) FILTER (WHERE status = ANY($3::text[])),
               0
             )::numeric,
             2
           ) AS paid_hours,
           COUNT(*) FILTER (
             WHERE late_minutes > 0
               AND status = ANY($3::text[])
           ) AS late_count,
           ROUND(
             COALESCE(
               SUM(total_pay) FILTER (WHERE status = ANY($3::text[])),
               0
             )::numeric,
             2
           ) AS total_pay
         FROM att_base`,
        [weekStartISO, effectiveEndISO, WEEKLY_INCLUDED_STATUSES]
      );

      const liveAbsentDays = await getLiveAbsentDaysForAllUsers(
        weekStart,
        effectiveEnd
      );

      res.json({
        week_start: weekStartISO,
        week_end: weekEndISO,
        summary_end: effectiveEndISO,
        summary: {
          worked_hours: Number(summary.rows[0]?.worked_hours ?? 0),
          paid_hours: Number(summary.rows[0]?.paid_hours ?? 0),
          late_count: Number(summary.rows[0]?.late_count ?? 0),
          absent_days: Number(liveAbsentDays ?? 0),
          total_pay: Number(summary.rows[0]?.total_pay ?? 0),
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
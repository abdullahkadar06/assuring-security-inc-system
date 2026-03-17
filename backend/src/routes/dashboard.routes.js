import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  autoCloseDueAttendances,
  enforceAutoCloseForUser,
  getTodayAttendanceForUser,
} from "../services/attendanceEngine.service.js";
import {
  SYSTEM_UTC_OFFSET_MINUTES,
  PAID_BREAK_LIMIT_SECONDS,
  MAX_SHIFT_HOURS,
} from "../constants/attendancePolicy.constants.js";

const router = Router();

const OFFSET_MS = SYSTEM_UTC_OFFSET_MINUTES * 60 * 1000;

function toSystemPseudo(date) {
  return new Date(date.getTime() + OFFSET_MS);
}

function fromSystemPseudo(date) {
  return new Date(date.getTime() - OFFSET_MS);
}

function getSystemParts(date = new Date()) {
  const d = toSystemPseudo(date);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

function buildSystemDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const pseudo = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return fromSystemPseudo(pseudo);
}

function startOfSystemDay(date) {
  const p = getSystemParts(date);
  return buildSystemDate(p.year, p.month, p.day, 0, 0, 0);
}

function addSystemDays(date, days) {
  const pseudo = toSystemPseudo(date);
  pseudo.setUTCDate(pseudo.getUTCDate() + days);
  return fromSystemPseudo(pseudo);
}

function getSystemDateISO(date = new Date()) {
  const p = getSystemParts(date);
  return `${String(p.year)}-${String(p.month).padStart(2, "0")}-${String(
    p.day
  ).padStart(2, "0")}`;
}

function minDate(a, b) {
  return a.getTime() <= b.getTime() ? a : b;
}

function getCurrentSaturdayFridayWindow(today = new Date()) {
  const dayStart = startOfSystemDay(today);
  const p = getSystemParts(dayStart);

  const daysSinceSaturday = (p.weekday - 6 + 7) % 7;
  const weekStart = addSystemDays(dayStart, -daysSinceSaturday);
  const weekEnd = addSystemDays(weekStart, 6);

  return {
    weekStart,
    weekEnd,
    effectiveEnd: minDate(dayStart, today),
  };
}

function getShiftKind(userShift) {
  const code = String(userShift?.code || "").toUpperCase();
  const name = String(userShift?.name || "").toUpperCase();

  if (code.includes("NIGHT") || name.includes("NIGHT")) return "NIGHT";
  return "MORNING";
}

function resolvePolicyForAnchorDate(anchorDate, shiftKind) {
  const anchor = startOfSystemDay(anchorDate);
  const parts = getSystemParts(anchor);

  if (shiftKind === "MORNING") {
    return {
      scheduledStart: buildSystemDate(parts.year, parts.month, parts.day, 8, 0, 0),
      scheduledEnd: buildSystemDate(parts.year, parts.month, parts.day, 16, 0, 0),
    };
  }

  if (parts.weekday === 6) {
    const nextDay = addSystemDays(anchor, 1);
    const next = getSystemParts(nextDay);

    return {
      scheduledStart: buildSystemDate(parts.year, parts.month, parts.day, 23, 0, 0),
      scheduledEnd: buildSystemDate(next.year, next.month, next.day, 7, 0, 0),
    };
  }

  if (parts.weekday === 0) {
    const nextDay = addSystemDays(anchor, 1);
    const next = getSystemParts(nextDay);

    return {
      scheduledStart: buildSystemDate(parts.year, parts.month, parts.day, 23, 0, 0),
      scheduledEnd: buildSystemDate(next.year, next.month, next.day, 8, 0, 0),
    };
  }

  return {
    scheduledStart: buildSystemDate(parts.year, parts.month, parts.day, 0, 0, 0),
    scheduledEnd: buildSystemDate(parts.year, parts.month, parts.day, 8, 0, 0),
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
      return getSystemDateISO(d);
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

  const weekStartISO = getSystemDateISO(weekStart);
  const effectiveEndISO = getSystemDateISO(effectiveEnd);

  const attendanceDates = await getAttendanceDatesForUser(
    userId,
    weekStartISO,
    effectiveEndISO
  );

  let absentDays = 0;
  let cursor = startOfSystemDay(weekStart);
  const end = startOfSystemDay(effectiveEnd);

  while (cursor.getTime() <= end.getTime()) {
    const policy = resolvePolicyForAnchorDate(cursor, shiftKind);
    const latestAllowed = new Date(
      policy.scheduledStart.getTime() + graceAfter * 60 * 1000
    );

    const anchorISO = getSystemDateISO(cursor);

    if (now.getTime() > latestAllowed.getTime() && !attendanceDates.has(anchorISO)) {
      absentDays += 1;
    }

    cursor = addSystemDays(cursor, 1);
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
    await enforceAutoCloseForUser(req.user.id);
    const today = await getTodayAttendanceForUser(req.user.id);
    res.json({ today });
  } catch (e) {
    next(e);
  }
});

router.get("/me/weekly", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const now = new Date();
    const { weekStart, weekEnd, effectiveEnd } =
      getCurrentSaturdayFridayWindow(now);

    const weekStartISO = getSystemDateISO(weekStart);
    const effectiveEndISO = getSystemDateISO(minDate(effectiveEnd, now));
    const weekEndISO = getSystemDateISO(weekEnd);

    const summaryQuery = await pool.query(
      `WITH att_base AS (
         SELECT
           a.id,
           a.user_id,
           a.status,
           a.scheduled_start,
           a.clock_in,
           a.clock_out,
           CASE
             WHEN a.status IN ('CLOSED', 'AUTO_CLOSED') AND a.clock_out IS NOT NULL
               THEN a.clock_out
             WHEN a.status = 'OPEN' AND a.scheduled_end IS NOT NULL
               THEN LEAST(NOW(), a.scheduled_end)
             WHEN a.status = 'OPEN'
               THEN NOW()
             ELSE a.clock_out
           END AS effective_clock_out,
           COALESCE(u.hourly_rate, 0) AS hourly_rate
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         WHERE a.user_id = $1
           AND a.status IN ('OPEN', 'CLOSED', 'AUTO_CLOSED')
           AND a.scheduled_start IS NOT NULL
           AND a.scheduled_start::date BETWEEN $2::date AND $3::date
       ),
       att_calc AS (
         SELECT
           ab.id,
           ab.user_id,
           ab.status,
           ab.scheduled_start,
           ab.clock_in,
           ab.clock_out,
           ab.effective_clock_out,
           COALESCE((
             SELECT SUM(
               GREATEST(
                 0,
                 EXTRACT(
                   EPOCH FROM (
                     LEAST(COALESCE(b.break_end, ab.effective_clock_out), ab.effective_clock_out)
                     - GREATEST(b.break_start, ab.clock_in)
                   )
                 )
               )
             )
             FROM breaks b
             WHERE b.attendance_id = ab.id
               AND b.break_start IS NOT NULL
               AND GREATEST(b.break_start, ab.clock_in) < ab.effective_clock_out
           ), 0) AS break_seconds,
           ab.hourly_rate
         FROM att_base ab
       ),
       final_rows AS (
         SELECT
           ac.id,
           ac.user_id,
           ac.status,
           ac.scheduled_start,
           ROUND(
             GREATEST(
               0,
               EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in)) - ac.break_seconds
             ) / 3600.0
           ::numeric, 2) AS worked_net_hours,
           ROUND(
             LEAST(
               $4::numeric,
               (
                 GREATEST(
                   0,
                   EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in))
                   - GREATEST(0, ac.break_seconds - $5)
                 ) / 3600.0
               )
             )::numeric,
             2
           ) AS paid_hours,
           ROUND((ac.break_seconds / 60.0)::numeric, 2) AS break_minutes,
           ROUND(
             (
               LEAST(
                 $4::numeric,
                 (
                   GREATEST(
                     0,
                     EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in))
                     - GREATEST(0, ac.break_seconds - $5)
                   ) / 3600.0
                 )
               ) * ac.hourly_rate
             )::numeric,
             2
           ) AS total_pay
         FROM att_calc ac
       )
       SELECT
         COUNT(*) AS shifts_count,
         ROUND(COALESCE(SUM(worked_net_hours), 0)::numeric, 2) AS worked_net_hours,
         ROUND(COALESCE(SUM(paid_hours), 0)::numeric, 2) AS paid_hours,
         ROUND(COALESCE(SUM(break_minutes), 0)::numeric, 2) AS break_minutes,
         ROUND(COALESCE(SUM(total_pay), 0)::numeric, 2) AS total_pay
       FROM final_rows`,
      [
        req.user.id,
        weekStartISO,
        effectiveEndISO,
        MAX_SHIFT_HOURS,
        PAID_BREAK_LIMIT_SECONDS,
      ]
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
      await autoCloseDueAttendances();

      const liveAbsentToday = await getLiveAbsentDaysForAllUsers(
        startOfSystemDay(new Date()),
        startOfSystemDay(new Date())
      );

      const todayISO = getSystemDateISO(new Date());

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
           WHERE (
             scheduled_start::date = $1::date
             OR scheduled_end::date = $1::date
           )
         )
         SELECT
           (SELECT total_staff FROM staff) AS total_staff,
           COALESCE((SELECT present_today FROM today_att), 0) AS present,
           COALESCE((SELECT late_today FROM today_att), 0) AS late`,
        [todayISO]
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
      await autoCloseDueAttendances();

      const now = new Date();
      const { weekStart, weekEnd, effectiveEnd } =
        getCurrentSaturdayFridayWindow(now);

      const weekStartISO = getSystemDateISO(weekStart);
      const effectiveEndISO = getSystemDateISO(minDate(effectiveEnd, now));
      const weekEndISO = getSystemDateISO(weekEnd);

      const summary = await pool.query(
        `WITH att_base AS (
           SELECT
             a.id,
             a.user_id,
             a.status,
             a.clock_in,
             a.clock_out,
             a.scheduled_start,
             a.scheduled_end,
             a.late_minutes,
             COALESCE(u.hourly_rate, 0) AS hourly_rate,
             CASE
               WHEN a.status IN ('CLOSED', 'AUTO_CLOSED') AND a.clock_out IS NOT NULL
                 THEN a.clock_out
               WHEN a.status = 'OPEN' AND a.scheduled_end IS NOT NULL
                 THEN LEAST(NOW(), a.scheduled_end)
               WHEN a.status = 'OPEN'
                 THEN NOW()
               ELSE a.clock_out
             END AS effective_clock_out
           FROM attendance a
           JOIN users u ON u.id = a.user_id
           WHERE a.status IN ('OPEN', 'CLOSED', 'AUTO_CLOSED')
             AND a.scheduled_start IS NOT NULL
             AND a.scheduled_start::date BETWEEN $1::date AND $2::date
         ),
         att_calc AS (
           SELECT
             ab.id,
             ab.user_id,
             ab.status,
             ab.late_minutes,
             COALESCE((
               SELECT SUM(
                 GREATEST(
                   0,
                   EXTRACT(
                     EPOCH FROM (
                       LEAST(COALESCE(b.break_end, ab.effective_clock_out), ab.effective_clock_out)
                       - GREATEST(b.break_start, ab.clock_in)
                     )
                   )
                 )
               )
               FROM breaks b
               WHERE b.attendance_id = ab.id
                 AND b.break_start IS NOT NULL
                 AND GREATEST(b.break_start, ab.clock_in) < ab.effective_clock_out
             ), 0) AS break_seconds,
             ab.clock_in,
             ab.effective_clock_out,
             ab.hourly_rate
           FROM att_base ab
         ),
         final_rows AS (
           SELECT
             ac.id,
             ac.user_id,
             ac.status,
             ac.late_minutes,
             ROUND(
               GREATEST(
                 0,
                 EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in)) - ac.break_seconds
               ) / 3600.0
             ::numeric, 2) AS worked_hours,
             ROUND(
               LEAST(
                 $3::numeric,
                 (
                   GREATEST(
                     0,
                     EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in))
                     - GREATEST(0, ac.break_seconds - $4)
                   ) / 3600.0
                 )
               )::numeric,
               2
             ) AS paid_hours,
             ROUND(
               (
                 LEAST(
                   $3::numeric,
                   (
                     GREATEST(
                       0,
                       EXTRACT(EPOCH FROM (ac.effective_clock_out - ac.clock_in))
                       - GREATEST(0, ac.break_seconds - $4)
                     ) / 3600.0
                   )
                 ) * ac.hourly_rate
               )::numeric,
               2
             ) AS total_pay
           FROM att_calc ac
         )
         SELECT
           ROUND(COALESCE(SUM(worked_hours), 0)::numeric, 2) AS worked_hours,
           ROUND(COALESCE(SUM(paid_hours), 0)::numeric, 2) AS paid_hours,
           COUNT(*) FILTER (WHERE late_minutes > 0) AS late_count,
           ROUND(COALESCE(SUM(total_pay), 0)::numeric, 2) AS total_pay
         FROM final_rows`,
        [
          weekStartISO,
          effectiveEndISO,
          MAX_SHIFT_HOURS,
          PAID_BREAK_LIMIT_SECONDS,
        ]
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
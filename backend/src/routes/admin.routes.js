import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";
import {
  SHIFT_KIND,
  SYSTEM_UTC_OFFSET_MINUTES,
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
  };
}

function buildSystemDate(year, month, day, hour = 0, minute = 0, second = 0) {
  const pseudo = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return fromSystemPseudo(pseudo);
}

function getSystemDayBoundsFromISO(dateText) {
  const raw = String(dateText || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const start = buildSystemDate(year, month, day, 0, 0, 0);
  const end = buildSystemDate(year, month, day, 23, 59, 59);

  return { start, end };
}

const patchAttendanceSchema = z.object({
  clock_in: z.string().datetime().optional(),
  clock_out: z.string().datetime().optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

const attendanceLookupSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid date is required"),
  shift_kind: z.enum([SHIFT_KIND.MORNING, SHIFT_KIND.NIGHT]),
});

router.get(
  "/attendance/lookup",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const parsed = attendanceLookupSchema.safeParse(req.query ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid lookup query",
          errors: parsed.error.flatten(),
        });
      }

      const { user_id, date, shift_kind } = parsed.data;
      const dayBounds = getSystemDayBoundsFromISO(date);

      if (!dayBounds) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const result = await pool.query(
        `SELECT
            a.*,
            s.code AS shift_code,
            s.name AS shift_name,
            s.start_time::text AS shift_start_time,
            s.end_time::text AS shift_end_time
         FROM attendance a
         LEFT JOIN shifts s
           ON s.id = a.shift_id
         WHERE a.user_id = $1
           AND (
             (a.scheduled_start IS NOT NULL AND a.scheduled_start BETWEEN $2 AND $3)
             OR
             (
               a.scheduled_start IS NULL
               AND a.clock_in IS NOT NULL
               AND a.clock_in BETWEEN $2 AND $3
             )
           )
           AND (
             CASE
               WHEN s.start_time IS NOT NULL
                    AND s.end_time IS NOT NULL
                    AND s.end_time <= s.start_time
                 THEN 'NIGHT'
               ELSE 'MORNING'
             END
           ) = $4
         ORDER BY COALESCE(a.scheduled_start, a.clock_in, a.created_at) DESC, a.id DESC
         LIMIT 1`,
        [user_id, dayBounds.start, dayBounds.end, shift_kind]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: "Attendance not found for the selected user, date, and shift",
        });
      }

      return res.json({ attendance: result.rows[0] });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/attendance/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const parsed = patchAttendanceSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid payload",
          errors: parsed.error.flatten(),
        });
      }

      const fields = parsed.data;
      const keys = Object.keys(fields);

      if (keys.length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map((k) => fields[k]);

      const upd = await pool.query(
        `UPDATE attendance
         SET ${sets}
         WHERE id = $${keys.length + 1}
         RETURNING *`,
        [...values, id]
      );

      if (upd.rowCount === 0) {
        return res.status(404).json({ message: "Attendance not found" });
      }

      await auditLog({
        actor_user_id: req.user.id,
        action: "ADMIN_CORRECTION",
        entity: "attendance",
        entity_id: id,
        meta: fields,
      });

      res.json({ attendance: upd.rows[0] });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const startSchema = z.object({
  attendance_id: z.number().int().positive().optional(),
});

const endSchema = z.object({
  break_id: z.number().int().positive().optional(),
  attendance_id: z.number().int().positive().optional(),
});

async function findOpenAttendanceForUser(userId) {
  const open = await pool.query(
    `SELECT id FROM attendance
     WHERE user_id = $1 AND status = 'OPEN'
     ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  return open.rowCount ? open.rows[0].id : null;
}

router.post("/start", requireAuth, async (req, res, next) => {
  try {
    const parsed = startSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    const attendanceId = parsed.data.attendance_id ?? (await findOpenAttendanceForUser(req.user.id));
    if (!attendanceId) return res.status(404).json({ message: "No OPEN attendance found. Clock-in first." });

    const openBreak = await pool.query(
      `SELECT id FROM breaks
       WHERE attendance_id = $1 AND break_end IS NULL
       ORDER BY id DESC LIMIT 1`,
      [attendanceId]
    );
    if (openBreak.rowCount > 0) return res.status(409).json({ message: "Break already started (open break exists)" });

    const ins = await pool.query(
      `INSERT INTO breaks (attendance_id, break_start)
       VALUES ($1, NOW())
       RETURNING id, attendance_id, break_start, break_end`,
      [attendanceId]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "BREAK_START",
      entity: "breaks",
      entity_id: ins.rows[0].id,
      meta: { attendance_id: attendanceId },
    });

    res.status(201).json({ break: ins.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.post("/end", requireAuth, async (req, res, next) => {
  try {
    const parsed = endSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    let breakId = parsed.data.break_id;

    if (!breakId) {
      const attendanceId = parsed.data.attendance_id ?? (await findOpenAttendanceForUser(req.user.id));
      if (!attendanceId) return res.status(404).json({ message: "No OPEN attendance found." });

      const openBreak = await pool.query(
        `SELECT id FROM breaks
         WHERE attendance_id = $1 AND break_end IS NULL
         ORDER BY id DESC LIMIT 1`,
        [attendanceId]
      );
      if (openBreak.rowCount === 0) return res.status(404).json({ message: "No open break found to end" });

      breakId = openBreak.rows[0].id;
    }

    const upd = await pool.query(
      `UPDATE breaks
       SET break_end = NOW()
       WHERE id = $1 AND break_end IS NULL
       RETURNING id, attendance_id, break_start, break_end`,
      [breakId]
    );

    if (upd.rowCount === 0) return res.status(409).json({ message: "Break already ended or not found" });

    await auditLog({
      actor_user_id: req.user.id,
      action: "BREAK_END",
      entity: "breaks",
      entity_id: upd.rows[0].id,
      meta: {},
    });

    res.json({ break: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
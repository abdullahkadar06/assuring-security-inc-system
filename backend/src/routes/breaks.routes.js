import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { auditLog } from "../utils/audit.js";
import { enforceAutoCloseForUser } from "../services/attendanceEngine.service.js";

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
    `SELECT id
     FROM attendance
     WHERE user_id = $1
       AND status = 'OPEN'
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );

  return open.rowCount ? open.rows[0].id : null;
}

async function ensureAttendanceBelongsToUser(attendanceId, userId) {
  const result = await pool.query(
    `SELECT id
     FROM attendance
     WHERE id = $1
       AND user_id = $2
     LIMIT 1`,
    [attendanceId, userId]
  );

  return result.rowCount > 0;
}

router.get("/current", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const attendanceId = await findOpenAttendanceForUser(req.user.id);

    if (!attendanceId) {
      return res.json({
        attendance_open: false,
        current_break: null,
      });
    }

    const openBreak = await pool.query(
      `SELECT id, attendance_id, break_start, break_end
       FROM breaks
       WHERE attendance_id = $1
         AND break_end IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [attendanceId]
    );

    return res.json({
      attendance_open: true,
      current_break: openBreak.rowCount ? openBreak.rows[0] : null,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/start", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const parsed = startSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    let attendanceId = parsed.data.attendance_id;

    if (attendanceId) {
      const allowed = await ensureAttendanceBelongsToUser(
        attendanceId,
        req.user.id
      );

      if (!allowed) {
        return res.status(403).json({
          message: "Attendance record does not belong to this user.",
        });
      }
    } else {
      attendanceId = await findOpenAttendanceForUser(req.user.id);
    }

    if (!attendanceId) {
      return res.status(404).json({
        message: "No open attendance found. Clock in first.",
      });
    }

    const openBreak = await pool.query(
      `SELECT id
       FROM breaks
       WHERE attendance_id = $1
         AND break_end IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [attendanceId]
    );

    if (openBreak.rowCount > 0) {
      return res.status(409).json({
        message: "An active break already exists.",
      });
    }

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

    return res.status(201).json({
      break: ins.rows[0],
      message: "Break started successfully.",
    });
  } catch (e) {
    next(e);
  }
});

router.post("/end", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const parsed = endSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    let breakId = parsed.data.break_id;

    if (!breakId) {
      let attendanceId = parsed.data.attendance_id;

      if (attendanceId) {
        const allowed = await ensureAttendanceBelongsToUser(
          attendanceId,
          req.user.id
        );

        if (!allowed) {
          return res.status(403).json({
            message: "Attendance record does not belong to this user.",
          });
        }
      } else {
        attendanceId = await findOpenAttendanceForUser(req.user.id);
      }

      if (!attendanceId) {
        return res.status(404).json({
          message: "No open attendance found.",
        });
      }

      const openBreak = await pool.query(
        `SELECT id
         FROM breaks
         WHERE attendance_id = $1
           AND break_end IS NULL
         ORDER BY id DESC
         LIMIT 1`,
        [attendanceId]
      );

      if (openBreak.rowCount === 0) {
        return res.status(404).json({
          message: "No active break found.",
        });
      }

      breakId = openBreak.rows[0].id;
    } else {
      const ownedBreak = await pool.query(
        `SELECT b.id
         FROM breaks b
         JOIN attendance a ON a.id = b.attendance_id
         WHERE b.id = $1
           AND a.user_id = $2
         LIMIT 1`,
        [breakId, req.user.id]
      );

      if (ownedBreak.rowCount === 0) {
        return res.status(403).json({
          message: "Break record does not belong to this user.",
        });
      }
    }

    const upd = await pool.query(
      `UPDATE breaks
       SET break_end = NOW()
       WHERE id = $1
         AND break_end IS NULL
       RETURNING id, attendance_id, break_start, break_end`,
      [breakId]
    );

    if (upd.rowCount === 0) {
      return res.status(409).json({
        message: "Break is already closed or was not found.",
      });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "BREAK_END",
      entity: "breaks",
      entity_id: upd.rows[0].id,
      meta: { attendance_id: upd.rows[0].attendance_id },
    });

    return res.json({
      break: upd.rows[0],
      message: "Break ended successfully.",
    });
  } catch (e) {
    next(e);
  }
});

export default router;
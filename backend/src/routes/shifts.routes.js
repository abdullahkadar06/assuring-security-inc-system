import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const shiftSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z_]+$/),
  name: z.string().min(2).max(100),
  start_time: z.string().regex(timeRegex, "Invalid start time format"),
  end_time: z.string().regex(timeRegex, "Invalid end time format"),
  grace_before_minutes: z.number().int().min(0).max(180).default(15),
  grace_after_minutes: z.number().int().min(0).max(180).default(15),
  is_active: z.boolean().default(true),
});

const assignSchema = z.object({
  user_id: z.number().int().positive(),
  shift_id: z.number().int().positive(),
});

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, code, name, start_time, end_time, grace_before_minutes, grace_after_minutes, is_active, created_at
       FROM shifts
       ORDER BY id ASC`
    );
    res.json({ shifts: r.rows });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = shiftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    const s = parsed.data;

    const existing = await pool.query(
      `SELECT id FROM shifts WHERE code = $1`,
      [s.code]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Shift code already exists" });
    }

    const r = await pool.query(
      `INSERT INTO shifts (code, name, start_time, end_time, grace_before_minutes, grace_after_minutes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        s.code,
        s.name,
        s.start_time,
        s.end_time,
        s.grace_before_minutes,
        s.grace_after_minutes,
        s.is_active,
      ]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "SHIFT_CREATE",
      entity: "shifts",
      entity_id: r.rows[0].id,
      meta: s,
    });

    res.status(201).json({ shift: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = shiftSchema.partial().safeParse(req.body);

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

    if (fields.code) {
      const dup = await pool.query(
        `SELECT id FROM shifts WHERE code = $1 AND id <> $2`,
        [fields.code, id]
      );

      if (dup.rowCount > 0) {
        return res.status(409).json({ message: "Shift code already exists" });
      }
    }

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const r = await pool.query(
      `UPDATE shifts
       SET ${sets}
       WHERE id = $${keys.length + 1}
       RETURNING *`,
      [...values, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Shift not found" });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "SHIFT_UPDATE",
      entity: "shifts",
      entity_id: id,
      meta: fields,
    });

    res.json({ shift: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const usage = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM users WHERE shift_id = $1)::int AS users_count,
        (SELECT COUNT(*) FROM attendance WHERE shift_id = $1)::int AS attendance_count
      `,
      [id]
    );

    const usageRow = usage.rows[0] || {
      users_count: 0,
      attendance_count: 0,
    };

    if (Number(usageRow.users_count) > 0 || Number(usageRow.attendance_count) > 0) {
      return res.status(400).json({
        message: "Cannot delete this shift because it is already in use",
        usage: usageRow,
      });
    }

    const r = await pool.query(`DELETE FROM shifts WHERE id = $1 RETURNING id`, [id]);

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Shift not found" });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "SHIFT_DELETE",
      entity: "shifts",
      entity_id: id,
    });

    res.json({ message: "Deleted", id: r.rows[0].id });
  } catch (e) {
    next(e);
  }
});

router.post("/assign", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    const { user_id, shift_id } = parsed.data;

    const s = await pool.query(
      `SELECT id, code, name FROM shifts WHERE id = $1 AND is_active = TRUE`,
      [shift_id]
    );

    if (s.rowCount === 0) {
      return res.status(404).json({ message: "Shift not found or inactive" });
    }

    const u = await pool.query(
      `UPDATE users
       SET shift_id = $1
       WHERE id = $2
       RETURNING id, full_name, email, role, shift_id`,
      [shift_id, user_id]
    );

    if (u.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "SHIFT_ASSIGN",
      entity: "users",
      entity_id: user_id,
      meta: { shift_id },
    });

    res.json({
      user: u.rows[0],
      shift: s.rows[0],
      message: "Shift assigned successfully",
    });
  } catch (e) {
    next(e);
  }
});

export default router;
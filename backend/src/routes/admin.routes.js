import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const patchAttendanceSchema = z.object({
  clock_in: z.string().datetime().optional(),
  clock_out: z.string().datetime().optional(),
  scheduled_start: z.string().datetime().optional(),
  scheduled_end: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

router.patch("/attendance/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = patchAttendanceSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    const fields = parsed.data;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: "No fields to update" });

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const upd = await pool.query(
      `UPDATE attendance
       SET ${sets}
       WHERE id = $${keys.length + 1}
       RETURNING *`,
      [...values, id]
    );

    if (upd.rowCount === 0) return res.status(404).json({ message: "Attendance not found" });

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
});

export default router;
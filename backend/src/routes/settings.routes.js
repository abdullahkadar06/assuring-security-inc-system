import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get("/overtime", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT overtime_mode, daily_threshold_hours, weekly_threshold_hours, overtime_multiplier, weekend_policy
       FROM overtime_settings WHERE id = 1`
    );
    return res.json({ overtime: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

const updateSchema = z.object({
  overtime_mode: z.enum(["NONE", "DAILY", "WEEKLY", "BOTH"]).optional(),
  daily_threshold_hours: z.number().nonnegative().optional(),
  weekly_threshold_hours: z.number().nonnegative().optional(),
  overtime_multiplier: z.number().min(1).optional(),
  weekend_policy: z.enum(["NONE", "SAT", "SUN", "BOTH"]).optional(),
});

router.put("/overtime", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });

    const fields = parsed.data;

    // build dynamic update
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ message: "No fields to update" });

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const q = `
      UPDATE overtime_settings
      SET ${sets}
      WHERE id = 1
      RETURNING overtime_mode, daily_threshold_hours, weekly_threshold_hours, overtime_multiplier, weekend_policy
    `;

    const r = await pool.query(q, values);
    return res.json({ overtime: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
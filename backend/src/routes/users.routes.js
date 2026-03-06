import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

/**
 * GET /api/users (ADMIN only)
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.hourly_rate, u.shift_id, u.is_active, u.created_at,
              u.phone, u.address,
              s.code as shift_code, s.name as shift_name, s.start_time::text as shift_start, s.end_time::text as shift_end
       FROM users u
       LEFT JOIN shifts s ON s.id = u.shift_id
       ORDER BY u.id ASC`
    );
    res.json({ users: result.rows });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/users/me  (Authenticated)
 * Returns current user basic profile
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, full_name, email, role, hourly_rate, shift_id, is_active, phone, address, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ message: "User not found" });
    return res.json({ user: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

const updateMeSchema = z.object({
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
});

/**
 * PUT /api/users/me (Authenticated)
 * Update phone/address ONLY for logged-in user
 */
router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const fields = parsed.data;
    const keys = Object.keys(fields);

    if (keys.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Build dynamic update safely
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const upd = await pool.query(
      `UPDATE users
       SET ${sets}
       WHERE id = $${keys.length + 1}
       RETURNING id, full_name, email, role, hourly_rate, shift_id, is_active, phone, address, created_at`,
      [...values, req.user.id]
    );

    if (upd.rowCount === 0) return res.status(404).json({ message: "User not found" });

    await auditLog({
      actor_user_id: req.user.id,
      action: "USER_UPDATE_ME",
      entity: "users",
      entity_id: req.user.id,
      meta: fields,
    });

    return res.json({ user: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
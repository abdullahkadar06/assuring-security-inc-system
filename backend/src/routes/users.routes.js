
import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/**
 * GET /api/users (ADMIN only)
 */
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.hourly_rate, u.shift_id, u.is_active, u.created_at,
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

export default router;
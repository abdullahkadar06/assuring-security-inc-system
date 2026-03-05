import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

/**
 * GET /api/payroll/:userId
 * ADMIN => can view anyone
 * EMPLOYEE => can view self
 */
router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (req.user.role !== "ADMIN" && req.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // NOTE: overtime_multiplier column may not exist in your payroll table.
    // We return only columns that exist in your original payroll schema.
    const result = await pool.query(
      `SELECT
          p.id, p.user_id, p.attendance_id,
          p.regular_hours, p.overtime_hours,
          p.hourly_rate, p.total_pay, p.created_at
       FROM payroll p
       WHERE p.user_id = $1
       ORDER BY p.id DESC`,
      [userId]
    );

    return res.json({ payroll: result.rows });
  } catch (e) {
    next(e);
  }
});

const recalcSchema = z.object({
  attendance_id: z.number().int().positive(),
});

/**
 * POST /api/payroll/recalculate
 * ADMIN only
 * Recalculate ONE attendance payroll using FIXED pay:
 * total_pay = paid_hours * hourly_rate
 * overtime_hours = 0
 * regular_hours = paid_hours
 */
router.post("/recalculate", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = recalcSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const attendanceId = parsed.data.attendance_id;

    const a = await pool.query(
      `SELECT a.id, a.user_id, a.paid_hours, a.status,
              u.hourly_rate
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [attendanceId]
    );

    if (a.rowCount === 0) return res.status(404).json({ message: "Attendance not found" });

    const row = a.rows[0];

    // You can decide: only allow recalculation for CLOSED attendances
    // If you want to allow OPEN, remove this check.
    if (row.status !== "CLOSED") {
      return res.status(400).json({ message: "Attendance must be CLOSED to calculate payroll" });
    }

    const paidHours = Number(row.paid_hours ?? 0);
    const rate = Number(row.hourly_rate ?? 0);

    // fixed policy: if present, paid_hours should be 8.00 (your attendance route sets 8.00 on clock-in)
    // total pay:
    const totalPay = Number((paidHours * rate).toFixed(2));

    // Upsert payroll for this attendance_id
    await pool.query(
      `INSERT INTO payroll (user_id, attendance_id, regular_hours, overtime_hours, hourly_rate, total_pay)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (attendance_id) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             regular_hours = EXCLUDED.regular_hours,
             overtime_hours = EXCLUDED.overtime_hours,
             hourly_rate = EXCLUDED.hourly_rate,
             total_pay = EXCLUDED.total_pay`,
      [row.user_id, attendanceId, paidHours, 0, rate, totalPay]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "PAYROLL_RECALC_FIXED",
      entity: "payroll",
      entity_id: null,
      meta: { attendance_id: attendanceId, paid_hours: paidHours, hourly_rate: rate, total_pay: totalPay },
    });

    return res.json({
      message: "Payroll recalculated (fixed pay)",
      attendance_id: attendanceId,
      user_id: row.user_id,
      paid_hours: paidHours,
      hourly_rate: rate,
      total_pay: totalPay,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
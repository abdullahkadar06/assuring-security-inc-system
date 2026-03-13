import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

router.get("/:userId", requireAuth, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    if (req.user.role !== "ADMIN" && req.user.id !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await pool.query(
      `SELECT
          p.id,
          p.user_id,
          p.attendance_id,
          p.regular_hours,
          p.overtime_hours,
          p.hourly_rate,
          p.total_pay,
          p.created_at
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

router.post("/recalculate", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = recalcSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    const attendanceId = parsed.data.attendance_id;

    const a = await pool.query(
      `SELECT
          a.id,
          a.user_id,
          a.clock_in,
          a.clock_out,
          a.total_hours,
          a.paid_hours,
          a.status,
          COALESCE(u.hourly_rate, 0) AS hourly_rate
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE a.id = $1`,
      [attendanceId]
    );

    if (a.rowCount === 0) {
      return res.status(404).json({ message: "Attendance not found" });
    }

    const row = a.rows[0];

    if (!["CLOSED", "AUTO_CLOSED"].includes(row.status)) {
      return res.status(400).json({
        message: "Attendance must be closed before payroll can be calculated",
      });
    }

    const paidHours = Number(row.paid_hours ?? 0);
    const rate = Number(row.hourly_rate ?? 0);
    const totalPay = Number((paidHours * rate).toFixed(2));

    await pool.query(
      `INSERT INTO payroll (
          user_id,
          attendance_id,
          regular_hours,
          overtime_hours,
          hourly_rate,
          total_pay
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (attendance_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         regular_hours = EXCLUDED.regular_hours,
         overtime_hours = EXCLUDED.overtime_hours,
         hourly_rate = EXCLUDED.hourly_rate,
         total_pay = EXCLUDED.total_pay`,
      [row.user_id, attendanceId, paidHours, 0, rate, totalPay]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "PAYROLL_RECALC",
      entity: "payroll",
      entity_id: null,
      meta: {
        attendance_id: attendanceId,
        paid_hours: paidHours,
        hourly_rate: rate,
        total_pay: totalPay,
      },
    });

    return res.json({
      message: "Payroll recalculated successfully",
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
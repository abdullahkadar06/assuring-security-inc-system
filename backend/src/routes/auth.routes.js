import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
  hourly_rate: z.number().nonnegative().default(0),
  shift_id: z.number().int().positive().optional(), // optional assignment on create
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
});

/**
 * POST /api/auth/register  (ADMIN ONLY)
 */
router.post("/register", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { full_name, email, phone, address, password, role, hourly_rate, shift_id } = parsed.data;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount > 0) return res.status(409).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // if shift_id provided, validate it is active
    if (shift_id) {
      const s = await pool.query(`SELECT id FROM shifts WHERE id = $1 AND is_active = TRUE`, [shift_id]);
      if (s.rowCount === 0) return res.status(400).json({ message: "Invalid shift_id (not found or inactive)" });
    }

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, address, password, role, hourly_rate, shift_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, TRUE)
       RETURNING id, full_name, email, role, hourly_rate, shift_id, phone, address, created_at`,
      [full_name, email, phone ?? null, address ?? null, hashed, role, hourly_rate, shift_id ?? null]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "USER_CREATE",
      entity: "users",
      entity_id: result.rows[0].id,
      meta: { email, role, shift_id: shift_id ?? null },
    });

    return res.status(201).json({ user: result.rows[0] });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/login  (PUBLIC)
 */
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const userRes = await pool.query(
      `SELECT id, full_name, email, password, role, hourly_rate, shift_id, is_active, phone, address
       FROM users WHERE email = $1`,
      [email]
    );
    if (userRes.rowCount === 0) return res.status(401).json({ message: "Invalid email or password" });

    const user = userRes.rows[0];
    if (!user.is_active) return res.status(403).json({ message: "Account disabled" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

    return res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate,
        shift_id: user.shift_id,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/auth/change-password (Authenticated)
 * payload: { current_password, new_password }
 */
router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
    }

    const { current_password, new_password } = parsed.data;

    // fetch current hash
    const r = await pool.query(
      `SELECT id, password, is_active
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (r.rowCount === 0) return res.status(404).json({ message: "User not found" });
    const user = r.rows[0];
    if (!user.is_active) return res.status(403).json({ message: "Account disabled" });

    const ok = await bcrypt.compare(current_password, user.password);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

    const same = await bcrypt.compare(new_password, user.password);
    if (same) return res.status(400).json({ message: "New password must be different" });

    const hashed = await bcrypt.hash(new_password, 10);

    await pool.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashed, req.user.id]);

    await auditLog({
      actor_user_id: req.user.id,
      action: "PASSWORD_CHANGE",
      entity: "users",
      entity_id: req.user.id,
      meta: {},
    });

    return res.json({ message: "Password changed successfully" });
  } catch (e) {
    next(e);
  }
});

export default router;
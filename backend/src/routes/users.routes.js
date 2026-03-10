import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

const createUserSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  hourly_rate: z.number().nonnegative().default(0),
  shift_id: z.number().int().positive().nullable().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
  is_active: z.boolean().default(true),
});

const updateMeSchema = z.object({
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
});

const adminUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  hourly_rate: z.number().nonnegative().optional(),
  shift_id: z.number().int().positive().nullable().optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  is_active: z.boolean().optional(),
});

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.hourly_rate,
          u.shift_id,
          u.is_active,
          u.created_at,
          u.phone,
          u.address,
          s.code AS shift_code,
          s.name AS shift_name,
          s.start_time::text AS shift_start,
          s.end_time::text AS shift_end
       FROM users u
       LEFT JOIN shifts s ON s.id = u.shift_id
       ORDER BY u.id ASC`
    );

    res.json({ users: result.rows });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [data.email.trim().toLowerCase()]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (data.shift_id !== null && data.shift_id !== undefined) {
      const shiftCheck = await pool.query(
        `SELECT id FROM shifts WHERE id = $1 LIMIT 1`,
        [data.shift_id]
      );

      if (shiftCheck.rowCount === 0) {
        return res.status(400).json({ message: "Invalid shift_id" });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const ins = await pool.query(
      `INSERT INTO users (
        full_name,
        email,
        password,
        role,
        hourly_rate,
        shift_id,
        is_active,
        phone,
        address
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING
        id,
        full_name,
        email,
        role,
        hourly_rate,
        shift_id,
        is_active,
        phone,
        address,
        created_at`,
      [
        data.full_name.trim(),
        data.email.trim().toLowerCase(),
        hashedPassword,
        data.role,
        data.hourly_rate,
        data.shift_id ?? null,
        data.is_active,
        data.phone ?? null,
        data.address ?? null,
      ]
    );

    await auditLog({
      actor_user_id: req.user.id,
      action: "USER_CREATE",
      entity: "users",
      entity_id: ins.rows[0].id,
      meta: {
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        shift_id: data.shift_id ?? null,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user: ins.rows[0],
    });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT 
          id,
          full_name,
          email,
          role,
          hourly_rate,
          shift_id,
          is_active,
          phone,
          address,
          created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = updateMeSchema.safeParse(req.body ?? {});
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

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const upd = await pool.query(
      `UPDATE users
       SET ${sets}
       WHERE id = $${keys.length + 1}
       RETURNING
         id,
         full_name,
         email,
         role,
         hourly_rate,
         shift_id,
         is_active,
         phone,
         address,
         created_at`,
      [...values, req.user.id]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

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

router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const parsed = adminUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid payload",
        errors: parsed.error.flatten(),
      });
    }

    const fields = parsed.data;
    const keys = Object.keys(fields);

    if (!keys.length) {
      return res.status(400).json({ message: "No fields to update" });
    }

    if (
      "shift_id" in fields &&
      fields.shift_id !== null &&
      fields.shift_id !== undefined
    ) {
      const s = await pool.query(`SELECT id FROM shifts WHERE id = $1`, [
        fields.shift_id,
      ]);

      if (s.rowCount === 0) {
        return res.status(400).json({ message: "Invalid shift_id" });
      }
    }

    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);

    const upd = await pool.query(
      `UPDATE users
       SET ${sets}
       WHERE id = $${keys.length + 1}
       RETURNING
         id,
         full_name,
         email,
         role,
         hourly_rate,
         shift_id,
         is_active,
         phone,
         address,
         created_at`,
      [...values, id]
    );

    if (upd.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "USER_UPDATE_ADMIN",
      entity: "users",
      entity_id: id,
      meta: fields,
    });

    res.json({ user: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (id === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own admin account" });
    }

    const del = await pool.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (del.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await auditLog({
      actor_user_id: req.user.id,
      action: "USER_DELETE",
      entity: "users",
      entity_id: id,
      meta: {},
    });

    res.json({ message: "User deleted" });
  } catch (e) {
    next(e);
  }
});

export default router;
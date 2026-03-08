import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.js";
import { auditLog } from "../utils/audit.js";

const router = Router();

// ... (Functions-kaagii hore ee timeToParts, toLocalDate, iwm halkooda ha joogaan)

// 🚀 QAYBTA CUSUB: Soo jiidashada dhammaan xogta maanta (Admin kaliya)
router.get("/list", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, u.full_name, u.role 
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.scheduled_start IS NOT NULL 
         AND a.scheduled_start::date = CURRENT_DATE
       ORDER BY a.clock_in DESC`
    );

    // Waxaan u habaynaynaa xogta sidii uu Frontend-ku filayay (r.user.full_name)
    const attendance = result.rows.map(row => ({
      ...row,
      user: {
        full_name: row.full_name,
        role: row.role
      }
    }));

    res.json({ attendance });
  } catch (e) {
    next(e);
  }
});

// --- CODES-KAA GII HORE (Halkan hoose ha ka bilaawdaan) ---

router.post("/clock-in", requireAuth, async (req, res, next) => {
  // ... koodhkii aad horay u haysatay
});

router.post("/clock-out", requireAuth, async (req, res, next) => {
  // ... koodhkii aad horay u haysatay
});

router.get("/today", requireAuth, async (req, res, next) => {
  // ... koodhkii aad horay u haysatay
});

router.get("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  // ... koodhkii aad horay u haysatay
});

export default router;
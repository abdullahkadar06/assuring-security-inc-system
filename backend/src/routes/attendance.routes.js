import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  enforceAutoCloseForUser,
  clockInUser,
  clockOutUser,
  getTodayAttendanceForUser,
} from "../services/attendanceEngine.service.js";

const router = Router();

router.post("/clock-in", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const result = await clockInUser({
      userId: req.user.id,
      actorUserId: req.user.id,
    });

    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
});

router.post("/clock-out", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);

    const result = await clockOutUser({
      userId: req.user.id,
      actorUserId: req.user.id,
      isAuto: false,
    });

    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
});

router.get("/today", requireAuth, async (req, res, next) => {
  try {
    await enforceAutoCloseForUser(req.user.id);
    const attendance = await getTodayAttendanceForUser(req.user.id);
    return res.json({ attendance });
  } catch (e) {
    next(e);
  }
});

export default router;
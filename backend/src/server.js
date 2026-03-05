import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import shiftsRoutes from "./routes/shifts.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import breaksRoutes from "./routes/breaks.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: env.corsOrigin, credentials: true }));

app.get("/api/health", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json({ status: "ok", time: result.rows[0].now, db: "connected" });
  } catch (e) {
    next(e);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/shifts", shiftsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/breaks", breaksRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// error handler last
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});
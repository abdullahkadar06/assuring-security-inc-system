// backend/src/middleware/error.middleware.js

export function errorHandler(err, req, res, next) {
  // Log full error in server
  console.error("❌ Error:", err);

  // If response already started
  if (res.headersSent) return next(err);

  // Default
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let extra = {};

  // ---- PostgreSQL errors (node-postgres) ----
  // Example: err.code, err.detail, err.constraint
  if (err?.code) {
    status = 500;
    message = "Database error";
    extra = {
      code: err.code,
      detail: err.detail ?? undefined,
      constraint: err.constraint ?? undefined,
      table: err.table ?? undefined,
    };
  }

  // ---- JWT errors ----
  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  }

  // ---- Zod validation errors ----
  // zod throws error with name "ZodError" sometimes (if not caught)
  if (err?.name === "ZodError") {
    status = 400;
    message = "Invalid payload";
    extra = { issues: err.issues };
  }

  // ---- In production, don't leak internals ----
  const isProd = process.env.NODE_ENV === "production";

  return res.status(status).json({
    message,
    ...(Object.keys(extra).length ? { error: extra } : {}),
    ...(!isProd ? { stack: err.stack } : {}),
  });
}
export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  if (res.headersSent) return next(err);

  let status = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let extra = {};

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

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  }

  if (err?.name === "ZodError") {
    status = 400;
    message = "Invalid payload";
    extra = { issues: err.issues };
  }

  const isProd = process.env.NODE_ENV === "production";

  return res.status(status).json({
    message,
    ...(Object.keys(extra).length ? { error: extra } : {}),
    ...(!isProd ? { stack: err.stack } : {}),
  });
}
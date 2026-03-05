// src/middleware/error.middleware.js

export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);

  // Postgres errors often have code
  if (err?.code) {
    return res.status(500).json({
      message: "Database error",
      code: err.code,
      detail: err.detail ?? undefined,
    });
  }

  return res.status(500).json({ message: "Internal server error" });
}
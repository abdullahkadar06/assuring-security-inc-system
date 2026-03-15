import { pool } from "../db/pool.js";

export async function auditLog({
  actor_user_id,
  action,
  entity,
  entity_id = null,
  meta = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, meta)
       VALUES ($1,$2,$3,$4,$5)`,
      [actor_user_id ?? null, action, entity, entity_id, meta]
    );
  } catch (e) {
    console.error("Audit log failed:", e?.message || e);
  }
}
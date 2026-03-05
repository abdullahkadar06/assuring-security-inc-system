import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ .env wuxuu ku yaalaa backend/.env (2 levels above src/config)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",

  db: {
    host: must("DB_HOST"),
    port: Number(must("DB_PORT")),
    name: must("DB_NAME"),
    user: must("DB_USER"),
    password: must("DB_PASSWORD"),
  },

  jwtSecret: must("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};
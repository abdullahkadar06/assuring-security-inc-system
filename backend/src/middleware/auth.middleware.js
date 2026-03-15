import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    const payload = jwt.verify(token, env.jwtSecret);

    req.user = {
      id: Number(payload.sub),
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
// frontend/src/config/env.js

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const ENV = {
  API_BASE_URL,
};
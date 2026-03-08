// 1. Vite wuxuu si otomaatig ah u ogaanayaa haddii aad 'npm run dev' ku jirto
const isDev = import.meta.env.MODE === "development";

// 2. Dooro link-ga saxda ah iyadoo loo eegayo deegaanka (Environment)
const API_BASE_URL = isDev
  ? "http://localhost:5000/api"                       // Markaad Localhost joogto
  : "https://assuring-security-api.onrender.com/api";  // Markaad Live joogto (Render)

export const ENV = {
  API_BASE_URL,
  MODE: import.meta.env.MODE,
};

// Console-ka ku qor si aad u aragto midka uu hadda isticmaalayo
console.log(`📡 API Mode: ${ENV.MODE} | BaseURL: ${API_BASE_URL}`);
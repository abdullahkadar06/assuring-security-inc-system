import axios from "axios";
import { ENV } from "../app/config/env";
import { useAuthStore } from "../state/auth/auth.store";

export const http = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 20000
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) useAuthStore.getState().logout();
    return Promise.reject(err);
  }
);
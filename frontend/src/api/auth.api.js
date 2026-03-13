import { http } from "./httpClient";

export const authApi = {
  login: (payload) => http.post("/auth/login", payload).then((r) => r.data),

  register: (payload) =>
    http.post("/auth/register", payload).then((r) => r.data),

  changePassword: (payload) =>
    http.post("/auth/change-password", payload).then((r) => r.data),

  me: () => http.get("/users/me").then((r) => r.data),
};
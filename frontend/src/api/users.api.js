import { http } from "./httpClient";

export const usersApi = {
  // ADMIN list users
  list: () => http.get("/users").then((r) => r.data),

  // ⚠️ Requires backend endpoint: PUT /api/users/me
  // payload: { phone, address }
  updateMe: (payload) => http.put("/users/me", payload).then((r) => r.data)
};
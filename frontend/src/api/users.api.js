import { http } from "./httpClient";

export const usersApi = {
  list: () => http.get("/users").then((r) => r.data),
  updateMe: (payload) => http.put("/users/me", payload).then((r) => r.data),

  updateByAdmin: (id, payload) => http.put(`/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id) => http.delete(`/users/${id}`).then((r) => r.data),
};
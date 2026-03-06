import { http } from "./httpClient";

export const shiftsApi = {
  list: () => http.get("/shifts").then((r) => r.data),                 // { shifts: [] }
  create: (payload) => http.post("/shifts", payload).then((r) => r.data), // { shift: {} }
  update: (id, payload) => http.put(`/shifts/${id}`, payload).then((r) => r.data),
  remove: (id) => http.delete(`/shifts/${id}`).then((r) => r.data),
  assign: (payload) => http.post("/shifts/assign", payload).then((r) => r.data) // { user: {} }
};
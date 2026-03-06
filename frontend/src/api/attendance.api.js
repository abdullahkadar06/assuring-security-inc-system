import { http } from "./httpClient";

export const attendanceApi = {
  clockIn: (payload = {}) => http.post("/attendance/clock-in", payload).then((r) => r.data),
  clockOut: (payload = {}) => http.post("/attendance/clock-out", payload).then((r) => r.data),
  todayAdmin: (params = {}) => http.get("/attendance/today", { params }).then((r) => r.data),
  getById: (id) => http.get(`/attendance/${id}`).then((r) => r.data) // ADMIN
};
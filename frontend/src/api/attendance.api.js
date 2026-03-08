import { http } from "./httpClient";

export const attendanceApi = {
  // Clock in/out ee shaqaalaha
  clockIn: (payload = {}) => http.post("/attendance/clock-in", payload).then((r) => r.data),
  clockOut: (payload = {}) => http.post("/attendance/clock-out", payload).then((r) => r.data),
  
  // Xogta maanta ee user-ka login-ka ah
  todayAdmin: (params = {}) => http.get("/attendance/today", { params }).then((r) => r.data),
  
  // Helitaanka hal record (Admin kaliya)
  getById: (id) => http.get(`/attendance/${id}`).then((r) => r.data) 
};
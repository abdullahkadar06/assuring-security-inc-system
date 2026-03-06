import { http } from "./httpClient";

export const payrollApi = {
  getByUserId: (userId) => http.get(`/payroll/${userId}`).then((r) => r.data),
  recalculate: (payload) => http.post("/payroll/recalculate", payload).then((r) => r.data) // ADMIN
};
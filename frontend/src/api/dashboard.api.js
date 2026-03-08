import { http } from "./httpClient";

export const dashboardApi = {
  meToday: () => http.get("/dashboard/me/today").then((r) => r.data),
  meWeekly: () => http.get("/dashboard/me/weekly").then((r) => r.data),

  adminOverview: () => http.get("/dashboard/admin/overview").then((r) => r.data),
  adminWeekly: () => http.get("/dashboard/admin/weekly").then((r) => r.data),
};
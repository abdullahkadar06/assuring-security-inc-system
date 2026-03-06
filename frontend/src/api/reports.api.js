import { http } from "./httpClient";

export const reportsApi = {
  finalizeWeek: (payload = {}) => http.post("/reports/finalize-week", payload).then((r) => r.data),
  weekly: (params = {}) => http.get("/reports/weekly", { params }).then((r) => r.data)
};
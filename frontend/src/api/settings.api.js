import { http } from "./httpClient";

export const settingsApi = {
  getOvertime: () => http.get("/settings/overtime").then((r) => r.data),
  updateOvertime: (payload) => http.put("/settings/overtime", payload).then((r) => r.data)
};
import { http } from "./httpClient";

export const breaksApi = {
  start: (payload = {}) =>
    http.post("/breaks/start", payload).then((r) => r.data),

  end: (payload = {}) =>
    http.post("/breaks/end", payload).then((r) => r.data),

  current: () => http.get("/breaks/current").then((r) => r.data),
};
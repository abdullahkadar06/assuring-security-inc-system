import { http } from "./httpClient";

export const adminApi = {
  patchAttendance: (id, payload) =>
    http.patch(`/admin/attendance/${id}`, payload).then((r) => r.data),

  findAttendanceRecord: (params) =>
    http.get("/admin/attendance/lookup", { params }).then((r) => r.data),
};
// import { http } from "./httpClient";

// export const usersApi = {
//   list: () => http.get("/users").then((r) => r.data),

//   createUser: (payload) =>
//     http.post("/users", payload).then((r) => r.data),

//   updateMe: (payload) =>
//     http.put("/users/me", payload).then((r) => r.data),

//   updateByAdmin: (id, payload) =>
//     http.put(`/users/${id}`, payload).then((r) => r.data),

//   deleteUser: (id) =>
//     http.delete(`/users/${id}`).then((r) => r.data),
// };

import { http } from "./httpClient";

export const usersApi = {
  list: () => http.get("/users").then((r) => r.data),
  
  // FIX: Kani waa koodhkii ka maqnaa ee Dashboard-ka u suurtogelinaya Refresh-ka
  getMe: () => http.get("/users/me").then((r) => r.data),

  createUser: (payload) =>
    http.post("/users", payload).then((r) => r.data),

  updateMe: (payload) =>
    http.put("/users/me", payload).then((r) => r.data),

  updateByAdmin: (id, payload) =>
    http.put(`/users/${id}`, payload).then((r) => r.data),

  deleteUser: (id) =>
    http.delete(`/users/${id}`).then((r) => r.data),
};
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import router from "./app/router.jsx";
import "./styles/index.css";
import "./styles/safe-area.css";

registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log("PWA service worker registered:", registration);
  },
  onRegisterError(error) {
    console.error("PWA service worker registration failed:", error);
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
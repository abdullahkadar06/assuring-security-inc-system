import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-192.png", "icons/pwa-512.png", "manifest.webmanifest"],
      manifest: {
        name: "Assuring Security Inc",
        short_name: "Assuring",
        description: "Attendance, Breaks, Payroll, Reports",
        start_url: "/",
        display: "standalone",
        background_color: "#0B1220",
        theme_color: "#0B1220",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
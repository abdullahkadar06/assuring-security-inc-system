/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0B1220",
          card: "#0F1A2E",
          line: "#1D2A44",
          blue: "#0B3D91",
          red: "#D32F2F",
          text: "#EAF0FF"
        }
      },
      boxShadow: {
        soft: "0 12px 32px rgba(0, 0, 0, 0.18)"
      }
    }
  },
  plugins: []
};
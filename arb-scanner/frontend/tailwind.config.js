/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          muted: "#2a2a3a",
        },
        profit: {
          DEFAULT: "#22c55e",
          dim: "#16a34a",
          glow: "rgba(34, 197, 94, 0.15)",
        },
        loss: {
          DEFAULT: "#ef4444",
          dim: "#dc2626",
          glow: "rgba(239, 68, 68, 0.15)",
        },
        accent: {
          DEFAULT: "#06b6d4",
          dim: "#0891b2",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "scan": "scan 4s linear infinite",
        "flash-green": "flash-green 600ms ease-out",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "flash-green": {
          "0%": { color: "#22c55e", textShadow: "0 0 6px rgba(34,197,94,0.4)" },
          "100%": { color: "", textShadow: "none" },
        },
      },
    },
  },
  plugins: [],
};

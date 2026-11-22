import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0b12",
        panel: "#11131f",
        panel2: "#171a2b",
        edge: "#262b45",
        neon: "#7c5cff",
        aqua: "#22d3ee",
        lime: "#a3e635",
        rose2: "#fb7185",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(124,92,255,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#534AB7",
        "brand-light": "#EEEDFE",
        canvas: "#F9F9F9",
        ink: "#1A1A1A",
        muted: "#6B7280",
        line: "#E5E7EB",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 24, 39, 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

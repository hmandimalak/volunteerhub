import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf7",
          100: "#d6faec",
          500: "#18b981",
          600: "#0f9668",
          900: "#064e3b"
        }
      }
    }
  },
  plugins: []
};

export default config;

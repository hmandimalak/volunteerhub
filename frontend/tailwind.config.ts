import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f0ff",
          100: "#e9dfff",
          500: "#8b5cf6",
          600: "#7c3aed",
          900: "#3b0764"
        },
        mint: "#6ee7b7",
        "cyan-glow": "#67e8f9",
        "pink-glow": "#fbcfe8",
        lilac: "#c4b5fd"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm "sunlit paper" palette
        paper: "#FBF7F0",
        surface: "#FFFFFF",
        ink: "#26221C",
        muted: "#6E6557",
        line: "#E9E0D2",
        clay: {
          50: "#FBF1ED",
          100: "#F5DED5",
          200: "#EBBCAB",
          300: "#DE9881",
          400: "#D17A5E",
          500: "#C2603F",
          600: "#A94E30",
          700: "#8A3F28",
        },
        sage: {
          100: "#E6EBE0",
          500: "#7C8B6F",
          700: "#56634B",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(38,34,28,0.04), 0 8px 24px -12px rgba(38,34,28,0.12)",
        lift: "0 2px 4px rgba(38,34,28,0.06), 0 16px 40px -16px rgba(38,34,28,0.20)",
      },
    },
  },
  plugins: [],
};
export default config;

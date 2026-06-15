import type { Config } from "tailwindcss";

// Brand design tokens (지침: Helvetica Neue · 자간 -2pt · 헤드라인 bold · 본문 light · 줄간격 160)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ['"Helvetica Neue"', "Helvetica", "Arial", "Pretendard", "sans-serif"],
      },
      letterSpacing: {
        brand: "-2pt", // 지침 자간 -2pt (headline)
        tight2: "-0.02em",
      },
      lineHeight: {
        brand: "1.6", // 지침 줄간격 160
      },
      fontWeight: {
        headline: "700", // bold
        body: "300", // light
      },
      colors: {
        brandBlue: "#0076BA",
        ink: "#1A1A1A",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

// MTSPACE COFFEE — Brand Redesign tokens (clay/oat/ink · Spectral/Helvetica/Plex Mono)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Helvetica Neue"', "Pretendard", "Arial", "sans-serif"],
        serif: ["Spectral", '"Noto Serif KR"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
        brand: ['"Helvetica Neue"', "Pretendard", "Arial", "sans-serif"],
      },
      colors: {
        clay: "#C68D62",
        clayDeep: "#B0764A",
        oat: "#F6F1E7",
        oatLight: "#FBF8F1",
        sand: "#ECE2D1",
        ink: "#3C352C",
        inkSoft: "#8A8173",
        line: "#E3DAC8",
        paper: "#FFFFFF",
        pageBg: "#E7E0D3",
        warmPaper: "#FAF6EE",
        notePanel: "#F3EFE6",
        // legacy aliases → on-brand
        brandBlue: "#B0764A",
      },
      borderColor: {
        DEFAULT: "#E3DAC8", // 하드라인 기본값 = warm border
      },
      borderRadius: {
        card: "3px",
        label: "2px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06)",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;

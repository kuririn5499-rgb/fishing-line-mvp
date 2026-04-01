import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ブランドカラー：海をイメージした青系
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // captain 画面用のダーク寄りアクセント
        sea: {
          dark: "#0c4a6e",
          mid: "#0369a1",
          light: "#7dd3fc",
        },
      },
    },
  },
  plugins: [],
};

export default config;

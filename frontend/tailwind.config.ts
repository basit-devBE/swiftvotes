import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f9fc",
        ink: "#07111f",
        line: "#d6deeb",
        primary: {
          DEFAULT: "#0f4cdb",
          soft: "#e8f0ff",
          deep: "#092466",
        },
        accent: "#b40f17",
      },
      boxShadow: {
        card: "0 24px 60px rgba(5, 17, 34, 0.08)",
        soft: "0 18px 40px rgba(15, 76, 219, 0.12)",
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(9, 36, 102, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(9, 36, 102, 0.06) 1px, transparent 1px)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};

export default config;

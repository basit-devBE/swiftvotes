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
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "image-in": {
          "0%": { opacity: "0", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.32s ease-out both",
        "pop-in": "pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "image-in": "image-in 0.45s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

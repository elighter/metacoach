import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        primary: "var(--primary)",
        "primary-ink": "var(--primary-ink)",
        "primary-wash": "var(--primary-wash)",
        accent: "var(--accent)",
        "accent-wash": "var(--accent-wash)",
        good: "var(--good)",
        "good-wash": "var(--good-wash)",
        warn: "var(--warn)",
        "warn-wash": "var(--warn-wash)",
        crit: "var(--crit)",
        "crit-wash": "var(--crit-wash)",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "SF Pro Text",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "JetBrains Mono",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,22,19,.04), 0 8px 24px -12px rgba(14,22,19,.12)",
        lg: "0 2px 4px rgba(14,22,19,.05), 0 24px 60px -24px rgba(14,22,19,.22)",
      },
    },
  },
  plugins: [],
};

export default config;

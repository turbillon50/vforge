import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
          3: "var(--bg-3)",
          elev: "var(--bg-elev)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          1: "var(--fg-1)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
        },
        border: {
          DEFAULT: "var(--border)",
          1: "var(--border-1)",
          2: "var(--border-2)",
        },
        green: {
          DEFAULT: "var(--green)",
          dim: "var(--green-dim)",
          glow: "var(--green-glow)",
          soft: "var(--green-soft)",
        },
        warning: "var(--warning)",
        error: "var(--error)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      transitionTimingFunction: {
        "smooth-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        "120": "120ms",
        "200": "200ms",
        "300": "300ms",
      },
      boxShadow: {
        "green-soft": "0 0 12px var(--green-glow)",
        "green-strong": "0 0 24px var(--green-glow)",
        elev: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px var(--border)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 0 0 var(--green-glow)",
          },
          "50%": {
            opacity: "0.7",
            boxShadow: "0 0 0 6px transparent",
          },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-dot":
          "pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up":
          "fade-up 0.3s cubic-bezier(0.4, 0, 0.2, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;

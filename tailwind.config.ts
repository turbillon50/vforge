import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic surfaces — react to data-theme via CSS variables
        void: "var(--color-void)",
        ink: "var(--color-ink)",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-low": "var(--color-surface-low)",
        "surface-high": "var(--color-surface-high)",
        "surface-elev": "var(--color-surface-elev)",

        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        muted: "var(--color-muted)",
        "off-white": "var(--color-off-white)",

        // Accents — currentColor friendly via vars
        "violet-300": "var(--color-violet-300)",
        "violet-400": "var(--color-violet-400)",
        "violet-500": "var(--color-violet-500)",
        "cyan-400": "var(--color-cyan-400)",
        "electric-blue": "var(--color-electric-blue)",
        "cyber-cyan": "var(--color-cyan-400)",
        "success-emerald": "var(--color-success-emerald)",
        "error-crimson": "var(--color-error-crimson)",

        // Static palettes (still useful for explicit tailwind shades elsewhere)
        violet: {
          100: "#e9ddff",
          200: "#d0bcff",
          300: "#b497ff",
          400: "#a078ff",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "Hanken Grotesk", "system-ui", "sans-serif"],
        display: ["var(--font-geist-sans)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "label-caps": ["11px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "300" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "300" }],
        "code-block": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-xl": ["48px", { lineHeight: "56px", letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-1": ["72px", { lineHeight: "1.02", letterSpacing: "-0.045em", fontWeight: "700" }],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      spacing: {
        gutter: "24px",
        "margin-desktop": "64px",
        "margin-mobile": "20px",
      },
      maxWidth: {
        container: "1440px",
      },
      backgroundImage: {
        "violet-cyan": "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)",
        "violet-aura":
          "radial-gradient(120% 80% at 50% 0%, rgba(139,92,246,calc(0.18 * var(--aura-opacity))), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(139,92,246,0.25), 0 0 60px rgba(34,211,238,0.10)",
        "glow-cyan": "0 0 24px rgba(34,211,238,0.25)",
        "glow-violet": "0 0 24px rgba(139,92,246,0.30)",
        elev: "var(--shadow-elev)",
      },
      animation: {
        breathe: "breathe 4s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.55", filter: "drop-shadow(0 0 12px rgba(139,92,246,0.45))" },
          "50%": { opacity: "1", filter: "drop-shadow(0 0 36px rgba(34,211,238,0.55))" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

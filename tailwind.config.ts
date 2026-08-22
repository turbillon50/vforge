import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  // vforge does NOT use src/ — files live at repo root.
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./i18n/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx,js,jsx,mdx}",
  ],
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
        // tint as theme colors so opacity modifier (bg-tint-1/40) works
        "tint-1": "rgb(var(--tint-1) / <alpha-value>)",
        "tint-2": "rgb(var(--tint-2) / <alpha-value>)",
        "tint-3": "rgb(var(--tint-3) / <alpha-value>)",
        "success-emerald": "var(--color-success-emerald)",
        "error-crimson": "var(--color-error-crimson)",
        // VForge HUD design tokens (forge page / composer)
        "vf-bg":      "var(--color-background, #0a0a0f)",
        "vf-bg-1":    "var(--color-surface, #111118)",
        "vf-bg-2":    "var(--color-surface-low, #0e0e14)",
        "vf-bg-3":    "var(--color-surface-high, #1a1a24)",
        "vf-border":  "var(--vf-border)",
        "vf-border-1":"var(--vf-border-1)",
        "vf-border-2":"var(--vf-border-2)",
        "vf-fg":      "var(--vf-fg)",
        "vf-fg-1":    "var(--vf-fg-1)",
        "vf-fg-2":    "var(--vf-fg-2)",
        "vf-green":   "#171717",
        "vf-error":   "#34363a",

        // Static palettes (still useful for explicit tailwind shades elsewhere)
        violet: {
          100: "#f2f2f0",
          200: "#dededb",
          300: "#9b9da1",
          400: "#73767b",
          500: "#34363a",
          600: "#262626",
          700: "#171717",
          800: "#0d0d0d",
          900: "#000000",
        },
        cyan: {
          400: "#73767b",
          500: "#34363a",
        },
        green: {
          300: "#9b9da1", 400: "#73767b", 500: "#34363a", 600: "#262626",
        },
        emerald: {
          100: "#f2f2f0", 200: "#dededb", 300: "#9b9da1", 400: "#73767b", 500: "#34363a", 600: "#262626",
        },
        red: {
          300: "#9b9da1", 400: "#73767b", 500: "#34363a", 600: "#262626",
        },
        amber: {
          200: "#dededb", 300: "#9b9da1", 400: "#73767b", 500: "#34363a", 600: "#262626",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "var(--font-hanken)", "system-ui", "sans-serif"],
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

      padding: {
        safe: "env(safe-area-inset-bottom, 0px)",
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
        "violet-cyan": "linear-gradient(135deg, #000000 0%, #34363a 100%)",
        "violet-aura":
          "radial-gradient(120% 80% at 50% 0%, rgba(0,0,0,calc(0.08 * var(--aura-opacity))), transparent 60%)",
      },
      boxShadow: {
        glow: "0 12px 30px rgba(0,0,0,0.08)",
        "glow-cyan": "0 12px 30px rgba(0,0,0,0.08)",
        "glow-violet": "0 12px 30px rgba(0,0,0,0.08)",
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
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
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

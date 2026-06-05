"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, useT } from "@/i18n/AppProviders";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t.common.theme_toggle_aria}
      title={t.common.theme_toggle_aria}
      className={
        compact
          ? "inline-flex h-11 w-11 items-center justify-center rounded-md border border-app-strong bg-tint-1 text-on-surface-variant transition hover:text-on-surface"
          : "inline-flex h-11 items-center gap-2 rounded-md border border-app-strong bg-tint-1 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant transition hover:text-on-surface"
      }
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {!compact && <span>{isDark ? "Claro" : "Oscuro"}</span>}
    </button>
  );
}

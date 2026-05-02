"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  className?: string;
  variant?: "pill" | "row";
}

export function ThemeToggle({ className, variant = "pill" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
    // Haptic feedback on mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    if (variant === "row") {
      return (
        <div className={cn("flex items-center justify-between py-3", className)}>
          <span className="text-sm text-vf-fg-1">Tema</span>
          <div className="w-14 h-7 rounded-full bg-vf-bg-2 border border-vf-border" />
        </div>
      );
    }
    return (
      <div className={cn("w-14 h-7 rounded-full bg-vf-bg-2 border border-vf-border", className)} />
    );
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center justify-between w-full py-3 min-h-[44px]",
          "text-sm transition-colors duration-200",
          className
        )}
        aria-label={`Cambiar tema · ${isDark ? "Oscuro" : "Claro"}`}
      >
        <span className="text-vf-fg-1">
          Tema · <span className="text-vf-fg">{isDark ? "Oscuro" : "Claro"}</span>
        </span>
        <TogglePill isDark={isDark} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn("relative", className)}
      aria-label={`Cambiar tema · ${isDark ? "Oscuro" : "Claro"}`}
    >
      <TogglePill isDark={isDark} />
      <span className="sr-only">{isDark ? "Tema oscuro activo" : "Tema claro activo"}</span>
    </button>
  );
}

function TogglePill({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={cn(
        "relative w-14 h-7 rounded-full",
        "bg-vf-bg-2 border border-vf-border",
        "transition-colors duration-200"
      )}
    >
      <motion.div
        className={cn(
          "absolute top-0.5 left-0.5 w-6 h-6 rounded-full",
          "bg-vf-bg-elev border border-vf-border-1",
          "flex items-center justify-center",
          "shadow-sm"
        )}
        animate={{
          x: isDark ? 0 : 26,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-3.5 h-3.5 text-vf-fg" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-3.5 h-3.5 text-vf-fg" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, dictionaries, locales, type Dictionary, type Locale } from "./dictionaries";

type Theme = "dark" | "light";

type AppContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: Dictionary;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

const LOCALE_KEY = "vforge.locale";
const THEME_KEY = "vforge.theme";

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (readCookie(LOCALE_KEY) || localStorage.getItem(LOCALE_KEY)) as Locale | null;
    if (stored && locales.includes(stored)) setLocaleState(stored);
    else {
      const browser = navigator.language?.slice(0, 2) as Locale;
      if (locales.includes(browser)) setLocaleState(browser);
    }
    const t = (localStorage.getItem(THEME_KEY) as Theme | null) ?? null;
    if (t === "dark" || t === "light") setThemeState(t);
    else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      setThemeState(prefersLight ? "light" : "dark");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("lang", locale);
    localStorage.setItem(LOCALE_KEY, locale);
    writeCookie(LOCALE_KEY, locale);
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = useCallback(
    () => setLocaleState((l) => (l === "es" ? "en" : "es")),
    []
  );
  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  const value = useMemo<AppContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: dictionaries[locale],
      theme,
      setTheme,
      toggleTheme,
    }),
    [locale, theme, setLocale, toggleLocale, setTheme, toggleTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProviders");
  return ctx;
}

export function useT() {
  return useApp().t;
}

export function useLocale() {
  const { locale, setLocale, toggleLocale } = useApp();
  return { locale, setLocale, toggleLocale };
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useApp();
  return { theme, setTheme, toggleTheme };
}

export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

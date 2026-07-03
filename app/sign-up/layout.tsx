"use client";
import { useEffect } from "react";

/**
 * Layout para rutas de autenticación (sign-in, sign-up).
 * Fuerza tema claro, elimina el fondo oscuro del root layout,
 * y oculta el SplashScreen.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      theme: html.getAttribute("data-theme"),
      bodyClass: body.className,
      bodyBg: body.style.background,
    };
    html.setAttribute("data-theme", "light");
    body.style.background = "#ffffff";
    body.style.color = "#1b1b1b";
    body.classList.remove("bg-void", "scanlines");
    // Ocultar splash si aparece
    const splash = body.querySelector("[style*='z-index: 9999']") as HTMLElement | null;
    if (splash) splash.style.display = "none";
    return () => {
      html.setAttribute("data-theme", prev.theme || "dark");
      body.style.background = prev.bodyBg;
      body.style.color = "";
      if (prev.bodyClass) body.className = prev.bodyClass;
    };
  }, []);
  return <>{children}</>;
}

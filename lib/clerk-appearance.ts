"use client";

import { dark } from "@clerk/themes";
import { useEffect, useState } from "react";

/**
 * Apariencia de la casa para los componentes de Clerk (SignIn, SignUp,
 * UserButton, UserProfile). Gradiente firma, radios y tipografía VForge,
 * y sigue el tema claro/oscuro de la app.
 */
export function useClerkAppearance() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.getAttribute("data-theme") !== "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return {
    baseTheme: isDark ? dark : undefined,
    layout: {
      // Registro de 1 tap: sociales arriba, grandes, como botón principal.
      socialButtonsPlacement: "top" as const,
      socialButtonsVariant: "blockButton" as const,
    },
    variables: isDark
      ? {
          colorPrimary: "#8b5cf6",
          colorTextOnPrimaryBackground: "#ffffff",
          borderRadius: "14px",
          fontSize: "15px",
        }
      : {
          // Variables claras explícitas: sin estos valores Clerk hereda
          // restos oscuros (inputs negros sobre blanco, botón Google sin texto).
          colorPrimary: "#8b5cf6",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "#ffffff",
          colorText: "#0c0c10",
          colorTextSecondary: "#4a4a55",
          colorInputBackground: "#f8f8fa",
          colorInputText: "#0c0c10",
          colorNeutral: "#0c0c10",
          colorDanger: "#ef4444",
          borderRadius: "14px",
          fontSize: "15px",
        },
    elements: {
      card: "shadow-elev backdrop-blur-xl",
      formButtonPrimary:
        "bg-gradient-to-r from-violet-500 to-cyan-500 hover:opacity-95 text-white normal-case text-[15px] font-medium shadow-glow-violet",
      headerTitle: "font-display tracking-tight",
      footerActionLink: "text-violet-400 hover:text-violet-300",
      socialButtonsBlockButton: isDark
        ? "border border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.14] hover:border-white/25 transition-all [&_svg]:opacity-100 [&_img]:brightness-0 [&_img]:invert"
        : "border border-black/12 bg-white text-[#0c0c10] hover:bg-black/[0.04] hover:border-black/20 transition-all",
      socialButtonsBlockButtonText: isDark ? "!text-white font-medium" : "!text-[#0c0c10] font-medium",
      socialButtonsProviderIcon: isDark ? "brightness-0 invert opacity-100" : "opacity-100",
      // Errores de Clerk (Turnstile/bot-check incluidos) siempre visibles.
      formFieldErrorText: "!text-[color:var(--color-error-crimson)] !opacity-100 !block",
      alert: "!border !border-[color:var(--color-error-crimson)] !text-[color:var(--color-error-crimson)] !opacity-100",
      alertText: "!text-[color:var(--color-error-crimson)] !opacity-100",
    },
  } as const;
}

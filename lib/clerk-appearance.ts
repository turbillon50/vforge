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
    variables: {
      colorPrimary: "#8b5cf6",
      colorTextOnPrimaryBackground: "#ffffff",
      borderRadius: "14px",
      fontSize: "15px",
    },
    elements: {
      card: "shadow-elev backdrop-blur-xl",
      formButtonPrimary:
        "bg-gradient-to-r from-violet-500 to-cyan-500 hover:opacity-95 text-white normal-case text-[15px] font-medium shadow-glow-violet",
      headerTitle: "font-display tracking-tight",
      footerActionLink: "text-violet-400 hover:text-violet-300",
    },
  } as const;
}

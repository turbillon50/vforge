import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "V",
  description: "V en tiempo real: platica, recuerda y encarga trabajo al colectivo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

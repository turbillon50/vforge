import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Sala de agentes",
  description: "Claude Code, Codex y V sobre un proyecto vivo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

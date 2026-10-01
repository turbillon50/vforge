import type { Metadata } from "next";

// Título propio de la pestaña. El layout raíz aplica la plantilla "%s · VForge".
export const metadata: Metadata = {
  title: "Trío",
  description: "Claude, ChatGPT y V en paralelo sobre el mismo proyecto.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

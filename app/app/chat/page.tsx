"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeStudio } from "@/components/studio/ForgeStudio";

/**
 * Estudio canónico. Si faltan los conectores críticos (GitHub o Vercel)
 * redirige una sola vez al setup ordenado para no saturar la interfaz.
 */
export default function ChatPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = await res.json();
        const connected = new Set(
          Array.isArray(data.connected)
            ? data.connected.map((s: string) => s.toLowerCase())
            : [],
        );
        const missingCritical = !connected.has("github") || !connected.has("vercel");
        // Solo redirigir si el usuario aún no ha visto el setup en esta sesión
        const seen = typeof window !== "undefined" && sessionStorage.getItem("vforge.setup.seen");
        if (missingCritical && !seen) {
          sessionStorage.setItem("vforge.setup.seen", "1");
          router.replace("/app/setup");
          return;
        }
      } catch {
        /* fall through to studio */
      }
      if (!cancelled) setReady(true);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100%",
          minHeight: "60vh",
          background: "var(--vf-bg)",
          color: "var(--vf-fg-2)",
          fontFamily: "monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Preparando estudio…
      </div>
    );
  }

  return <ForgeStudio />;
}

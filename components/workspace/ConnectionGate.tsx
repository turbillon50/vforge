"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Si el owner aún no conectó GitHub o Vercel, la plataforma no es un taller:
 * es un visor vacío. Forzamos /app/setup antes de dejar entrar al estudio.
 *
 * Excepciones: setup, live (clientes), integrations (por si llega del OAuth).
 */
const SKIP_PREFIXES = [
  "/app/setup",
  "/app/live",
  "/app/integrations",
];

export function ConnectionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = (await res.json()) as { connected?: string[] };
        const list = (data.connected ?? []).map((s) => s.toLowerCase());
        const hasGithub = list.includes("github");
        const hasVercel = list.includes("vercel");

        if (!hasGithub || !hasVercel) {
          if (!cancelled) {
            router.replace("/app/setup");
            return;
          }
        }
      } catch {
        /* si falla status, no bloqueamos el estudio */
      }
      if (!cancelled) setReady(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="grid min-h-[40vh] place-items-center bg-[#f7f7f5]">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Preparando el taller…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

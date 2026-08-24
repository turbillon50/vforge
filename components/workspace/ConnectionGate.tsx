"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const SKIP_KEY = "vforge.setupSkipped";

const SKIP_PREFIXES = [
  "/app/setup",
  "/app/live",
  "/app/integrations",
];

/**
 * Sin GitHub + Vercel el taller no existe.
 * Si el usuario eligió "Saltar", respetamos la bandera (sin loop).
 */
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
        if (typeof window !== "undefined" && localStorage.getItem(SKIP_KEY) === "1") {
          if (!cancelled) setReady(true);
          return;
        }
      } catch {
        /* private mode */
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
        /* no bloquear si status cae */
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

export function markSetupSkipped() {
  try {
    localStorage.setItem(SKIP_KEY, "1");
  } catch {
    /* ok */
  }
}

export function clearSetupSkipped() {
  try {
    localStorage.removeItem(SKIP_KEY);
  } catch {
    /* ok */
  }
}

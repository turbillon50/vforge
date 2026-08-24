"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectSteps } from "@/components/onboarding/ConnectSteps";
import { VWordmark } from "@/components/brand/VMark";
import { markSetupSkipped, clearSetupSkipped } from "@/components/workspace/ConnectionGate";

export default function SetupPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.connected)
          ? data.connected.map((s: string) => String(s).toLowerCase())
          : [];
        setConnections(new Set(list));
        // Si ya tiene núcleo, no forzar skip viejo
        if (list.includes("github") && list.includes("vercel")) {
          clearSetupSkipped();
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].some((k) => ["github", "vercel", "stripe"].includes(k))) {
      void load();
    }
  }, [load]);

  function goStudio(skip = false) {
    if (skip) markSetupSkipped();
    else clearSetupSkipped();
    router.push("/app/chat");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f5] text-black">
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--border-1)] bg-white px-5 md:px-8">
        <Link href="/" aria-label="VForge">
          <VWordmark />
        </Link>
        <button
          type="button"
          onClick={() => goStudio(true)}
          className="text-[12px] text-[var(--fg-muted)] underline underline-offset-4"
        >
          Saltar por ahora
        </button>
      </header>

      <div className="border-b border-[var(--border-1)] bg-white px-5 py-8 md:px-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
          Plan · Integrate · Execute
        </p>
        <h1 className="mt-2 max-w-xl text-[clamp(1.6rem,3vw,2rem)] font-semibold tracking-[-0.04em]">
          Conecta la infraestructura. Después construyes.
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-6 text-[var(--fg-secondary)]">
          GitHub y Vercel son el mínimo para que el taller exista. Sin ellos solo hay un chat vacío.
        </p>
      </div>

      <main className="flex flex-1 items-start justify-center pt-4 md:pt-6">
        {loading ? (
          <p className="mt-20 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Revisando conexiones…
          </p>
        ) : (
          <ConnectSteps
            connections={connections}
            onRefresh={() => void load()}
            onComplete={() => goStudio(false)}
          />
        )}
      </main>
    </div>
  );
}

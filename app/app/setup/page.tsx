"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectSteps } from "@/components/onboarding/ConnectSteps";
import { VWordmark } from "@/components/brand/VMark";

/**
 * Setup post-login — layout Stitch (B&W, un paso a la vez).
 * Conecta GitHub → Vercel → Stripe → token MCP con OAuth real.
 */
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
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Si vuelves del OAuth con ?github=connected etc., refresca
    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].some((k) => ["github", "vercel", "stripe"].includes(k))) {
      void load();
    }
  }, [load]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f5] text-black">
      <header className="flex h-[60px] items-center justify-between border-b border-[var(--border-1)] bg-white px-5 md:px-8">
        <Link href="/" aria-label="Forge">
          <VWordmark />
        </Link>
        <button
          type="button"
          onClick={() => router.push("/app/chat")}
          className="text-[12px] text-[var(--fg-muted)] underline underline-offset-4"
        >
          Saltar por ahora
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center pt-6 md:pt-10">
        {loading ? (
          <p className="mt-20 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
            Revisando conexiones…
          </p>
        ) : (
          <ConnectSteps
            connections={connections}
            onRefresh={() => void load()}
            onComplete={() => router.push("/app/chat")}
          />
        )}
      </main>
    </div>
  );
}

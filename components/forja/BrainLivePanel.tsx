"use client";

// components/forja/BrainLivePanel.tsx
// Panel "Fábrica en Vivo": consume /api/taller (proxy owner-only al brain-relay
// de Hetzner) y muestra el estado real de los procesos pm2 + métricas vivas.
// Sin datos inventados: si el relay no responde, se muestra estado vacío real.

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconActivity, IconLoader, IconWarn } from "@/components/brand/VFIcons";

interface ServiceRow {
  name: string;
  status: string;
}

interface TallerPayload {
  ok: boolean;
  live: boolean;
  services: ServiceRow[];
  events: { label: string; tone: string }[];
  metrics: { servicesOnline?: number; servicesTotal?: number; latencyMs?: number };
  error?: string;
}

export function BrainLivePanel() {
  const [data, setData] = useState<TallerPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/taller", { cache: "no-store" });
      if (r.ok) setData((await r.json()) as TallerPayload);
    } catch {
      /* estado vacío real — sin inventar datos */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <IconLoader size={22} />
        </motion.span>
      </div>
    );
  }

  const live = data?.live ?? false;
  const services = data?.services ?? [];
  const online = Number(data?.metrics?.servicesOnline ?? 0);
  const total = Number(data?.metrics?.servicesTotal ?? services.length);
  const latency = data?.metrics?.latencyMs;

  if (!live || services.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
        <IconActivity size={20} className="mx-auto text-white/20" />
        <p className="mt-2 text-xs text-white/35">
          {data?.error ? "Relay sin conexión." : "Fábrica en reposo — sin procesos en línea."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumen vivo */}
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0e0b1e]/90 to-[#0a0814]/90 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300/90">
            {online}/{total} procesos en línea
          </span>
        </div>
        {typeof latency === "number" && (
          <span className="font-mono text-[10px] tabular-nums text-white/35">{latency} ms</span>
        )}
      </div>

      {/* Procesos pm2 reales */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <AnimatePresence initial={false}>
          {services.map((s, i) => {
            const ok = s.status === "online";
            return (
              <motion.div
                key={`${s.name}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 last:border-0"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-400"}`}
                  />
                  <span className="truncate font-mono text-[11px] text-white/70">{s.name}</span>
                </span>
                <span
                  className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${
                    ok ? "text-emerald-300/70" : "text-amber-300/70"
                  }`}
                >
                  {!ok && <IconWarn size={10} />}
                  {s.status}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

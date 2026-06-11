"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";
import { IconCpu, IconClock, IconCheck } from "@/components/brand/VFIcons";

interface Automation {
  id?: string;
  name: string;
  type?: "daemon" | "cron" | string;
  status?: string;
  detail?: string;
}

interface AutomationsData {
  automations?: Automation[];
}

type IconComp = (p: { size?: number; className?: string; style?: React.CSSProperties }) => ReactNode;

export default function AutomatizacionesPage() {
  const [data, setData] = useState<AutomationsData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/automatizaciones", { cache: "no-store" });
        const json = (await res.json()) as AutomationsData;
        if (alive) setData(json);
      } catch {
        if (alive) setData((prev) => prev ?? { automations: [] });
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const automations = data?.automations ?? [];

  return (
    <div className="min-h-full">
      <PageHeader title="Automatizaciones" eyebrow="El ecosistema trabajando solo" />

      <div className="px-5 py-6 md:px-8">
        {/* Header visual con asset del taller */}
        <div
          className="reveal-up relative mb-6 h-[200px] overflow-hidden rounded-2xl border border-white/[0.06]"
          style={{ backgroundImage: "url(/taller/automatizacion.png)", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, var(--color-void) 100%)" }}
          />
          <div className="relative flex h-full flex-col justify-end p-5 md:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/80">
              Daemons &amp; crons
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-white/90 md:text-xl">
              {automations.length} {automations.length === 1 ? "proceso" : "procesos"} en marcha
            </h2>
          </div>
        </div>

        {!data ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <ObsidianLoader label="Cargando" />
          </div>
        ) : automations.length === 0 ? (
          <div className="reveal-up flex min-h-[160px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[13px] text-white/40">
            No hay automatizaciones activas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {automations.map((a, i) => {
              const isCron = a.type === "cron";
              const Icon: IconComp = isCron ? IconClock : IconCpu;
              const active = (a.status ?? "").toLowerCase() === "active";
              return (
                <article
                  key={a.id ?? i}
                  className="reveal-up group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-md transition-colors hover:border-violet-500/30 hover:bg-white/[0.04]"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-violet-400"
                      style={{ background: "var(--color-surface)" }}
                    >
                      <Icon size={20} />
                    </span>
                    <span
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider " +
                        (active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-white/[0.04] text-white/40")
                      }
                    >
                      {active && <IconCheck size={11} />}
                      {a.status ?? "idle"}
                    </span>
                  </div>

                  <h3 className="mt-3 truncate font-display text-[15px] font-semibold text-white/90">
                    {a.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
                    {isCron ? "cron" : "daemon"}
                  </p>

                  {a.detail && (
                    <p className="mt-2 text-[13px] leading-relaxed text-white/45">{a.detail}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

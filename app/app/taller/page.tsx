"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";
import {
  TallerPanel,
  type TallerService,
  type TallerMetrics,
  type TallerEvent,
} from "@/components/workspace/TallerPanel";

type TallerData = {
  ok: boolean;
  live: boolean;
  services: TallerService[];
  metrics: TallerMetrics;
  events: TallerEvent[];
};

export default function TallerPage() {
  const [data, setData] = useState<TallerData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/taller", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (alive) setData(j);
        })
        .catch(() => {
          if (alive) setData((prev) => prev ?? { ok: false, live: false, services: [], metrics: {}, events: [] });
        });
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const loading = data === null;

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Operación en vivo"
        title="Taller"
        description="Cabina del operador: procesos, métricas y actividad del host en Hetzner, reportando en tiempo real."
        actions={
          <span
            className={`chip ${
              data?.live
                ? "text-emerald-600 dark:text-emerald-300"
                : "text-amber-600 dark:text-amber-300"
            }`}
          >
            {data?.live ? "Relay en línea" : "Relay sin respuesta"}
          </span>
        }
      />

      <div className="reveal-up p-5 md:p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <ObsidianLoader size="lg" label="Encendiendo el taller…" />
          </div>
        ) : (
          <TallerPanel
            live={data.live}
            services={data.services ?? []}
            metrics={data.metrics ?? {}}
            events={data.events ?? []}
          />
        )}
      </div>
    </div>
  );
}

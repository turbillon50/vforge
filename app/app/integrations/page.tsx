"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { CheckCircle2, CircleDot, XCircle } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface HealthData {
  ok: boolean;
  checks: Record<string, boolean | string | number>;
}

interface IntegrationStat {
  name: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export default function IntegrationsPage() {
  const t = useT();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v-health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const integrations: IntegrationStat[] = data
    ? Object.entries(data.checks).map(([name, value]) => {
        const isBool = typeof value === "boolean";
        const ok = isBool ? value : true;
        return {
          name,
          status: ok ? "ok" : "error",
          detail: String(value),
        };
      })
    : [];

  return (
    <>
      <PageHeader
        eyebrow={t.integrations.eyebrow}
        title={t.integrations.title}
        description={t.integrations.body}
      />

      <div className="px-5 py-6 md:px-8">
        {loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[100px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && integrations.length === 0 && (
          <div className="rounded-xl border border-app bg-tint-1 p-10 text-center text-on-surface-variant">
            <p className="font-display text-lg">No pude leer el healthcheck</p>
            <p className="mt-2 text-sm">
              El endpoint /api/v-health no respondió. Revisa logs.
            </p>
          </div>
        )}

        {!loading && integrations.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((i) => (
              <div
                key={i.name}
                className="rounded-xl border border-app bg-tint-1 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-semibold text-on-surface capitalize">
                    {i.name.replace(/_/g, " ")}
                  </p>
                  {i.status === "ok" && (
                    <CheckCircle2 size={16} className="text-success-emerald shrink-0" />
                  )}
                  {i.status === "warning" && (
                    <CircleDot size={16} className="text-cyber-cyan animate-pulse shrink-0" />
                  )}
                  {i.status === "error" && (
                    <XCircle size={16} className="text-error-crimson shrink-0" />
                  )}
                </div>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted truncate">
                  {i.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

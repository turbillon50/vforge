"use client";

import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Activity, CheckCircle2, CircleDot, Rocket, Timer, XCircle } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export default function DeploymentsPage() {
  const t = useT();
  const deploys = [
    { id: "dpl_84z", project: "orion-web", env: "production", commit: "feat: stripe checkout", status: "ready", duration: "42s", time: "12m" },
    { id: "dpl_83p", project: "orion-api", env: "preview", commit: "feat: bookings endpoint", status: "building", duration: "—", time: "4m" },
    { id: "dpl_82s", project: "orion-web", env: "preview", commit: "design: cinematic hero", status: "ready", duration: "38s", time: "3h" },
    { id: "dpl_81n", project: "orion-jobs", env: "production", commit: "feat: nightly backup", status: "ready", duration: "27s", time: "1d" },
    { id: "dpl_80c", project: "orion-api", env: "production", commit: "fix: rate limit", status: "failed", duration: "1m 12s", time: "1d" },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.deployments.eyebrow}
        title={t.deployments.title}
        description={t.deployments.body}
        actions={
          <>
            <button className="btn-ghost">{t.deployments.open_vercel}</button>
            <button className="btn-primary"><Rocket size={13} /> {t.deployments.promote}</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 px-5 pt-6 md:grid-cols-4 md:px-8">
        <StatCard icon={Activity} label={t.deployments.stats.healthy} value="99.98%" tone="emerald" />
        <StatCard icon={Timer} label={t.deployments.stats.avg_build} value="38s" tone="cyan" />
        <StatCard icon={CheckCircle2} label={t.deployments.stats.released_today} value="7" tone="violet" />
        <StatCard icon={XCircle} label={t.deployments.stats.failed_7d} value="1" tone="crimson" />
      </div>

      <div className="px-5 py-6 md:px-8">
        <div className="overflow-hidden rounded-xl border border-app">
          <table className="w-full text-left text-sm">
            <thead className="bg-tint-1 text-on-surface-variant">
              <tr className="font-mono text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3">{t.deployments.table.deploy}</th>
                <th className="px-4 py-3">{t.deployments.table.project}</th>
                <th className="px-4 py-3">{t.deployments.table.env}</th>
                <th className="px-4 py-3">{t.deployments.table.commit}</th>
                <th className="px-4 py-3">{t.deployments.table.build}</th>
                <th className="px-4 py-3">{t.deployments.table.status}</th>
                <th className="px-4 py-3">{t.deployments.table.when}</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map((d) => (
                <tr key={d.id} className="border-t border-app hover:bg-tint-1">
                  <td className="px-4 py-3 font-mono text-[12px] text-on-surface-variant">{d.id}</td>
                  <td className="px-4 py-3 text-on-surface">{d.project}</td>
                  <td className="px-4 py-3">
                    <span className={d.env === "production" ? "chip text-success-emerald" : "chip text-cyber-cyan"}>
                      ● {d.env === "production" ? t.common.status_live : t.common.status_preview}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{d.commit}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-on-surface-variant">{d.duration}</td>
                  <td className="px-4 py-3">
                    {d.status === "ready" && (
                      <span className="chip text-success-emerald">
                        <CheckCircle2 size={11} /> {t.common.status_ready}
                      </span>
                    )}
                    {d.status === "building" && (
                      <span className="chip text-cyber-cyan">
                        <CircleDot size={11} className="animate-pulse" /> {t.common.status_building}
                      </span>
                    )}
                    {d.status === "failed" && <span className="chip text-error-crimson">● {t.common.status_failed}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-muted">{d.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "emerald" | "cyan" | "violet" | "crimson";
}) {
  const m = {
    emerald: "text-success-emerald",
    cyan: "text-cyber-cyan",
    violet: "text-violet-300",
    crimson: "text-error-crimson",
  };
  return (
    <div className="rounded-xl border border-app bg-tint-1 p-4">
      <Icon size={14} className={`${m[tone]} opacity-90`} />
      <p className="label-caps mt-2 text-muted">{label}</p>
      <p className={`font-display text-2xl font-semibold ${m[tone]}`}>{value}</p>
    </div>
  );
}

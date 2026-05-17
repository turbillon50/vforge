"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import { Copy, Eye, KeyRound, Lock, RefreshCcw, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

const secrets = [
  { key: "STRIPE_SECRET_KEY", env: "production", scope: "orion-web", rotated: "12d" },
  { key: "CLERK_SECRET_KEY", env: "production", scope: "orion-web", rotated: "3d" },
  { key: "DATABASE_URL", env: "production", scope: "orion-api", rotated: "1d" },
  { key: "TWILIO_AUTH_TOKEN", env: "production", scope: "orion-jobs", rotated: "21d" },
  { key: "MAPS_API_KEY", env: "production", scope: "orion-web", rotated: "—" },
  { key: "SENTRY_DSN", env: "preview", scope: "orion-web", rotated: "—" },
];

export default function SecretsPage() {
  const t = useT();
  return (
    <>
      <PageHeader
        eyebrow={t.secrets.eyebrow}
        title={t.secrets.title}
        description={t.secrets.body}
        actions={
          <>
            <button className="btn-ghost">
              <RefreshCcw size={13} /> {t.secrets.rotate_all}
            </button>
            <button className="btn-primary">
              <KeyRound size={13} /> {t.secrets.add}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 px-5 pt-6 md:grid-cols-4 md:px-8">
        <Stat label={t.secrets.stats.encrypted} value="AES-256-GCM" tone="violet" />
        <Stat label={t.secrets.stats.rotations} value="11" tone="cyan" />
        <Stat label={t.secrets.stats.audit} value="284" tone="emerald" />
        <Stat label={t.secrets.stats.stale} value="2" tone="crimson" />
      </div>

      <div className="px-5 py-6 md:px-8">
        <div className="rounded-xl border border-app">
          <div className="flex items-center justify-between border-b border-app px-4 py-3">
            <p className="label-caps text-muted">{t.secrets.list_label}</p>
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted">
              <ShieldCheck size={12} className="text-success-emerald" /> {t.secrets.sealed}
            </div>
          </div>
          <ul>
            {secrets.map((s) => (
              <li
                key={s.key}
                className="grid grid-cols-12 items-center gap-3 border-b border-app px-4 py-3 last:border-0 hover:bg-tint-1"
              >
                <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                  <Lock size={14} className="text-violet-300" />
                  <span className="font-mono text-[13px] text-on-surface">{s.key}</span>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className={s.env === "production" ? "chip text-success-emerald" : "chip text-cyber-cyan"}>
                    ● {s.env === "production" ? t.common.status_live : t.common.status_preview}
                  </span>
                </div>
                <div className="col-span-4 md:col-span-2 text-[12px] text-on-surface-variant">{s.scope}</div>
                <div className="col-span-4 md:col-span-1 font-mono text-[11px] uppercase tracking-widest text-muted">
                  {s.rotated}
                </div>
                <div className="col-span-12 md:col-span-2 flex items-center gap-1 md:justify-end">
                  <button className="rounded-md p-2 text-on-surface-variant hover:bg-tint-2 hover:text-on-surface">
                    <Eye size={14} />
                  </button>
                  <button className="rounded-md p-2 text-on-surface-variant hover:bg-tint-2 hover:text-on-surface">
                    <Copy size={14} />
                  </button>
                  <button className="rounded-md p-2 text-on-surface-variant hover:bg-tint-2 hover:text-on-surface">
                    <RefreshCcw size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "violet" | "cyan" | "emerald" | "crimson";
}) {
  const m = {
    violet: "text-violet-300",
    cyan: "text-cyber-cyan",
    emerald: "text-success-emerald",
    crimson: "text-error-crimson",
  };
  return (
    <div className="rounded-xl border border-app bg-tint-1 p-4">
      <p className="label-caps text-muted">{label}</p>
      <p className={`mt-2 font-display text-lg font-semibold ${m[tone]}`}>{value}</p>
    </div>
  );
}

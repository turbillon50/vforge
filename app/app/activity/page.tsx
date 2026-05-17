"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/workspace/PageHeader";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Globe2,
  KeyRound,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ring: number | null;
  payload: unknown;
  created_at: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(ms / (1000 * 60));
  if (mins >= 1) return `${mins}m`;
  return "ahora";
}

function iconAndToneFor(action: string): {
  icon: LucideIcon;
  tone: "violet" | "cyan" | "emerald" | "crimson";
} {
  if (action.startsWith("forge.chat")) return { icon: Sparkles, tone: "violet" };
  if (action.startsWith("project.")) return { icon: GitBranch, tone: "violet" };
  if (action.startsWith("vercel.") || action.includes("deploy"))
    return { icon: Rocket, tone: "emerald" };
  if (action.startsWith("vault.") || action.includes("secret"))
    return { icon: KeyRound, tone: "cyan" };
  if (action.startsWith("namecom.") || action.includes("dns"))
    return { icon: Globe2, tone: "emerald" };
  if (action.startsWith("github.")) return { icon: GitBranch, tone: "violet" };
  if (action.includes("error") || action.includes("fail"))
    return { icon: AlertTriangle, tone: "crimson" };
  if (action.includes("ok") || action.includes("complete"))
    return { icon: CheckCircle2, tone: "emerald" };
  if (action.includes("self-heal") || action.includes("repair"))
    return { icon: Wrench, tone: "cyan" };
  if (action.includes("seal") || action.includes("auth"))
    return { icon: ShieldCheck, tone: "cyan" };
  return { icon: Sparkles, tone: "violet" };
}

function summaryOf(ev: AuditEvent): string {
  if (ev.resource_type && ev.resource_id) {
    return `${ev.resource_type} · ${ev.resource_id}`;
  }
  if (ev.resource_id) return ev.resource_id;
  return ev.resource_type ?? "—";
}

export default function ActivityPage() {
  const t = useT();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forge/activity?limit=50", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events: AuditEvent[]; error?: string }) => {
        if (d.error) setError(d.error);
        setEvents(d.events ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={t.activity.eyebrow}
        title={t.activity.title}
        description={t.activity.body}
        actions={<button className="btn-ghost">{t.activity.export}</button>}
      />

      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        {error && (
          <div className="mb-4 rounded-md border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[70px] rounded-xl border border-app bg-tint-1/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div className="text-center text-on-surface-variant py-10">
            <p className="font-display text-lg">Sin eventos todavía.</p>
            <p className="mt-2 text-sm">
              Cuando V actúe sobre tus proyectos, vault o deploys, los
              registros aparecen aquí.
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <ol className="relative space-y-4 border-l border-app pl-6">
            {events.map((ev) => {
              const { icon: Icon, tone } = iconAndToneFor(ev.action);
              const dotColor =
                tone === "violet"
                  ? "bg-violet-400"
                  : tone === "cyan"
                    ? "bg-cyber-cyan"
                    : tone === "emerald"
                      ? "bg-success-emerald"
                      : "bg-error-crimson";
              return (
                <li key={ev.id} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-void ${dotColor}`}
                  />
                  <div className="rounded-xl border border-app bg-tint-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon size={15} className="text-on-surface-variant shrink-0" />
                        <p className="font-display font-semibold text-on-surface truncate">
                          {ev.action}
                        </p>
                        {ev.ring !== null && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-muted shrink-0">
                            ring {ev.ring}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted shrink-0">
                        {timeAgo(ev.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {summaryOf(ev)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

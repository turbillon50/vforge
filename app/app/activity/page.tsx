"use client";

import { useEffect, useState } from "react";
import { Activity, Check, GitBranch, Globe2, KeyRound, Rocket, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ring: number | null;
  payload: unknown;
  created_at: string;
}

function timeAgo(iso: string) {
  const difference = Date.now() - new Date(iso).getTime();
  const days = Math.floor(difference / 86_400_000);
  if (days >= 1) return `hace ${days}d`;
  const hours = Math.floor(difference / 3_600_000);
  if (hours >= 1) return `hace ${hours}h`;
  const minutes = Math.floor(difference / 60_000);
  return minutes >= 1 ? `hace ${minutes}m` : "ahora";
}

function eventMeta(action: string) {
  if (action.startsWith("forge.chat")) return { Icon: Sparkles, color: "#ff5c35" };
  if (action.startsWith("project.")) return { Icon: GitBranch, color: "#6270c8" };
  if (action.includes("deploy") || action.startsWith("vercel.")) return { Icon: Rocket, color: "#3f9464" };
  if (action.includes("secret") || action.startsWith("vault.")) return { Icon: KeyRound, color: "#9b6d32" };
  if (action.includes("dns")) return { Icon: Globe2, color: "#3f9464" };
  if (action.includes("error") || action.includes("fail")) return { Icon: TriangleAlert, color: "#b54734" };
  if (action.includes("ok") || action.includes("complete")) return { Icon: Check, color: "#3f9464" };
  if (action.includes("auth") || action.includes("seal")) return { Icon: ShieldCheck, color: "#6270c8" };
  return { Icon: Activity, color: "#8a847a" };
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forge/activity?limit=50", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { events: [] })
      .then((data: { events: AuditEvent[]; error?: string }) => { if (data.error) setError(data.error); setEvents(data.events ?? []); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-[920px]">
        <header><p className="text-sm font-medium text-[#ff5c35]">Bitácora</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1b1a17] sm:text-5xl">Lo que está pasando</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#777168]">Cambios, despliegues y acciones importantes ordenados como una conversación.</p></header>

        {error ? <div className="mt-6 rounded-[16px] border border-[#e7aaa0] bg-[#fff3f0] px-4 py-3 text-sm text-[#9f2d1b]">No pudimos cargar toda la actividad: {error}</div> : null}

        <section className="mt-9 rounded-[22px] border border-[#d9d4c9] bg-[#fbfaf7] p-3 sm:p-5">
          {loading ? <div className="space-y-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[72px] rounded-[14px] bg-[#ebe7df]" />)}</div> : null}
          {!loading && events.length === 0 && !error ? <div className="py-20 text-center"><p className="text-lg font-semibold text-[#1b1a17]">La bitácora está limpia</p><p className="mt-2 text-sm text-[#777168]">Los próximos cambios aparecerán aquí.</p></div> : null}
          {!loading && events.length ? (
            <ol className="divide-y divide-[#e7e2d9]">
              {events.map((event) => {
                const { Icon, color } = eventMeta(event.action);
                return (
                  <li key={event.id} className="flex gap-3 px-2 py-4 sm:px-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0ede6]" style={{ color }}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><p className="truncate text-sm font-semibold text-[#1b1a17]">{event.action}</p><time className="shrink-0 text-[11px] text-[#aaa49b]">{timeAgo(event.created_at)}</time></div>{event.resource_type || event.resource_id ? <p className="mt-1 truncate text-xs text-[#777168]">{[event.resource_type, event.resource_id].filter(Boolean).join(" · ")}</p> : null}</div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>
      </div>
    </div>
  );
}

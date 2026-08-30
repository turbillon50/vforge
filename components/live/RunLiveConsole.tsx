"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatElapsed,
  isLiveRunStatus,
  runnerWaitCopy,
} from "@/lib/live/run-console";
import { IconLoader, IconSend } from "@/components/brand/VFIcons";

interface QueueJobRef {
  id: number;
  agent: string;
  role: string;
}

interface QueueJob {
  id: number;
  agent: string | null;
  status: string;
  progress: number | null;
  result: string | null;
  logTail: string | null;
}

export function RunLiveConsole({
  createdAt,
  status,
  jobs,
  jobRefs,
  canWrite,
  busy,
  onNudge,
}: {
  createdAt: string;
  status: string;
  jobs: Map<number, QueueJob>;
  jobRefs: QueueJobRef[];
  canWrite: boolean;
  busy: boolean;
  onNudge: (message: string) => Promise<void>;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [nudge, setNudge] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const live = isLiveRunStatus(status);
  const started = new Date(createdAt).getTime();
  const elapsed = Number.isFinite(started) ? now - started : 0;

  const log = useMemo(() => {
    const chunks = jobRefs.flatMap((ref) => {
      const job = jobs.get(ref.id);
      const body = (job?.logTail || job?.result || "").trim();
      if (!body) return [];
      return [`▸ ${ref.agent} · ${ref.role}\n${body}`];
    });
    return chunks.join("\n\n");
  }, [jobRefs, jobs]);

  const wait = runnerWaitCopy(elapsed, Boolean(log));
  const progress = jobRefs.reduce((max, ref) => {
    const value = jobs.get(ref.id)?.progress;
    return value == null ? max : Math.max(max, value);
  }, 0);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [log, wait]);

  async function sendNudge(event: React.FormEvent) {
    event.preventDefault();
    const text = nudge.trim();
    if (!text || busy || !live) return;
    await onNudge(text);
    setNudge("");
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-black bg-black text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-white" : "bg-white/40"}`}
          />
          <p className="font-mono text-[8px] uppercase tracking-[0.14em]">
            Consola · {live ? "en vivo" : status}
          </p>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/55">
          {formatElapsed(elapsed)}
          {progress > 0 ? ` · ${Math.round(progress)}%` : ""}
        </p>
      </header>
      <div
        ref={scroller}
        className="max-h-[280px] min-h-[180px] overflow-auto px-3 py-3 font-mono text-[11px] leading-5"
      >
        {log ? (
          <pre className="whitespace-pre-wrap text-white/90">{log}</pre>
        ) : (
          <p className="text-white/55">{wait}</p>
        )}
        {live ? (
          <span className="mt-2 inline-block h-3 w-1.5 animate-pulse bg-white" />
        ) : null}
      </div>
      {canWrite && live ? (
        <form
          onSubmit={(event) => void sendNudge(event)}
          className="flex items-center gap-2 border-t border-white/15 px-2 py-2"
        >
          <span className="pl-1 font-mono text-[11px] text-white/40">›</span>
          <input
            value={nudge}
            onChange={(event) => setNudge(event.target.value)}
            maxLength={4000}
            placeholder="Háblale a Grok mientras trabaja…"
            className="min-h-9 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={busy || nudge.trim().length < 2}
            className="grid h-8 w-8 place-items-center rounded-md border border-white/20 disabled:opacity-30"
            aria-label="Enviar a Grok"
          >
            {busy ? (
              <IconLoader size={12} className="animate-spin" />
            ) : (
              <IconSend size={12} />
            )}
          </button>
        </form>
      ) : null}
    </section>
  );
}

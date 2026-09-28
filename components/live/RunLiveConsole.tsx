"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatElapsed,
  isLiveRunStatus,
  runnerWaitCopy,
} from "@/lib/live/run-console";
import { runnerLooksDead } from "@/lib/live/run-pulse";

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
  const log = useMemo(() => {
    const chunks = jobRefs.flatMap((ref) => {
      const job = jobs.get(ref.id);
      const body = (job?.logTail || job?.result || "").trim();
      if (!body) return [];
      return [`▸ ${ref.agent} · ${ref.role}\n${body}`];
    });
    return chunks.join("\n\n");
  }, [jobRefs, jobs]);
  const dead = runnerLooksDead(log) || status === "failed";
  const live = !dead && isLiveRunStatus(status);
  const started = new Date(createdAt).getTime();
  const age = Number.isFinite(started) ? now - started : 0;
  const wait = runnerWaitCopy(age, Boolean(log));

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
        <p className="font-mono text-[8px] uppercase tracking-[0.14em]">
          {dead ? "Consola · falló" : live ? "Consola · en vivo" : `Consola · ${status}`}
        </p>
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/55">
          {live ? formatElapsed(age) : dead ? "muerto" : ""}
        </p>
      </header>
      <div
        ref={scroller}
        className="max-h-[220px] min-h-[140px] overflow-auto px-3 py-3 font-mono text-[11px] leading-5"
      >
        {log ? (
          <pre className="whitespace-pre-wrap text-white/90">{log}</pre>
        ) : (
          <p className="text-white/55">{wait}</p>
        )}
        {live ? <span className="mt-2 inline-block h-3 w-1.5 animate-pulse bg-white" /> : null}
      </div>
      {canWrite && live ? (
        <form
          onSubmit={(event) => void sendNudge(event)}
          className="flex items-center gap-2 border-t border-white/15 px-2 py-2"
        >
          <input
            value={nudge}
            onChange={(event) => setNudge(event.target.value)}
            maxLength={4000}
            placeholder="Nudge al runner"
            className="min-h-9 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={busy || nudge.trim().length < 2}
            className="px-2 font-mono text-[10px] uppercase disabled:opacity-30"
          >
            Enviar
          </button>
        </form>
      ) : null}
    </section>
  );
}

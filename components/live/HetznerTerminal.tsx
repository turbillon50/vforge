"use client";

import { useEffect, useMemo, useRef } from "react";

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

export function HetznerTerminal({
  jobs,
  jobRefs,
}: {
  jobs: Map<number, QueueJob>;
  jobRefs: QueueJobRef[];
}) {
  const scroller = useRef<HTMLPreElement>(null);
  const text = useMemo(() => {
    const blocks = jobRefs.map((ref) => {
      const job = jobs.get(ref.id);
      const body = (job?.logTail || job?.result || "").replace(/\s+$/g, "");
      const head = `$ ${ref.agent} ${ref.role}`;
      return body ? `${head}\n${body}` : head;
    });
    return blocks.join("\n\n") || "$ — sin salida";
  }, [jobRefs, jobs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [text]);

  return (
    <pre
      ref={scroller}
      className="h-full min-h-0 flex-1 overflow-auto bg-[#111110] px-3 py-3 font-mono text-[12px] leading-5 text-[#d7d3cb]"
    >
      {text}
    </pre>
  );
}

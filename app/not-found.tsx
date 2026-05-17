"use client";

import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useT } from "@/i18n/AppProviders";

export default function NotFound() {
  const t = useT();
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-violet-aura" />
      <VWordmark />
      <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-cyber-cyan">{t.not_found.code}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{t.not_found.title}</h1>
      <p className="mt-3 max-w-md text-on-surface-variant">{t.not_found.body}</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-ghost">{t.not_found.back}</Link>
        <Link href="/app/chat" className="btn-primary">{t.not_found.open_workspace}</Link>
      </div>
    </div>
  );
}

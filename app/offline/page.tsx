"use client";

import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import { useT } from "@/i18n/AppProviders";

export default function OfflinePage() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <VWordmark />
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight md:text-4xl">{t.offline.title}</h1>
      <p className="mt-3 max-w-md text-on-surface-variant">{t.offline.body}</p>
      <Link href="/app/chat" className="btn-primary mt-8">{t.offline.open_shell}</Link>
    </div>
  );
}

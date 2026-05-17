"use client";

import Link from "next/link";
import { useT } from "@/i18n/AppProviders";

export function ClerkPlaceholder({ mode }: { mode: "sign-in" | "sign-up" }) {
  const t = useT();
  return (
    <div className="glass-strong w-full max-w-md rounded-2xl p-8">
      <h2 className="font-display text-2xl font-semibold">
        {mode === "sign-in" ? t.auth.sign_in_title : t.auth.sign_up_title}
      </h2>
      <p className="mt-2 text-sm text-on-surface-variant">{t.auth.placeholder_disabled_note}</p>
      <div className="mt-6 space-y-3">
        <button className="btn-ghost w-full justify-start">{t.auth.sso_github}</button>
        <button className="btn-ghost w-full justify-start">{t.auth.sso_google}</button>
        <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="h-px flex-1 bg-tint-3" />
          {t.auth.separator_or}
          <span className="h-px flex-1 bg-tint-3" />
        </div>
        <input className="input-base" placeholder={t.auth.email_placeholder} />
        <input className="input-base" placeholder={t.auth.password_placeholder} type="password" />
        <Link href={mode === "sign-in" ? "/app" : "/onboarding"} className="btn-primary w-full">
          {mode === "sign-in" ? t.auth.enter_vforge : t.common.cta_continue}
        </Link>
      </div>
    </div>
  );
}

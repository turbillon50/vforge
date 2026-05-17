"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import { Bell, CreditCard, KeyRound, Palette, ShieldCheck, Users } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

const icons = [Users, Palette, Bell, ShieldCheck, KeyRound, CreditCard];

export default function SettingsPage() {
  const t = useT();
  const sections = t.settings.sections.map((s, i) => ({ icon: icons[i], ...s }));
  return (
    <>
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} description={t.settings.body} />
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {sections.map((s) => (
          <article
            key={s.title}
            className="rounded-xl border border-app bg-tint-1 p-5 transition hover:border-violet-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20">
                <s.icon size={18} />
              </div>
              <h3 className="font-display text-base font-semibold">{s.title}</h3>
            </div>
            <p className="mt-3 text-sm text-on-surface-variant">{s.body}</p>
            <button className="btn-ghost mt-5 !px-3 !py-1.5 text-[10px]">{t.settings.open}</button>
          </article>
        ))}
      </div>
    </>
  );
}

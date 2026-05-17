"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import { ArrowRight, BookOpen, Compass, Lightbulb, MessageCircle, Sparkles, Trophy, Users } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export default function HubPage() {
  const t = useT();
  return (
    <>
      <PageHeader eyebrow={t.hub.eyebrow} title={t.hub.title} description={t.hub.body} />

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12 md:p-8">
        <article className="md:col-span-7 relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-cyan-400/[0.04] p-7">
          <span className="chip border-violet-500/30 bg-violet-500/5 text-violet-300">
            <Sparkles size={11} /> {t.hub.featured}
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {t.hub.manifesto_title}
          </h2>
          <p className="mt-3 max-w-xl text-on-surface-variant">{t.hub.manifesto_body}</p>
          <button className="btn-primary mt-6">
            {t.hub.read_essay} <ArrowRight size={13} />
          </button>
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-violet-500/30 blur-3xl" />
        </article>

        <article className="md:col-span-5 rounded-2xl border border-app bg-tint-1 p-6">
          <BookOpen size={18} className="text-cyber-cyan" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t.hub.learning}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {t.hub.learning_items.map((label) => (
              <li key={label} className="flex items-center justify-between rounded-md border border-app px-3 py-2.5">
                <span>{label}</span>
                <ArrowRight size={12} />
              </li>
            ))}
          </ul>
        </article>

        <article className="md:col-span-4 rounded-2xl border border-app bg-tint-1 p-6">
          <Compass size={18} className="text-violet-300" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t.hub.templates}</h3>
          <p className="mt-2 text-sm text-on-surface-variant">{t.hub.templates_body}</p>
          <button className="btn-ghost mt-5">{t.hub.browse_all}</button>
        </article>

        <article className="md:col-span-4 rounded-2xl border border-app bg-tint-1 p-6">
          <Users size={18} className="text-cyber-cyan" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t.hub.community}</h3>
          <p className="mt-2 text-sm text-on-surface-variant">{t.hub.community_body}</p>
          <button className="btn-ghost mt-5">{t.hub.open_discord}</button>
        </article>

        <article className="md:col-span-4 rounded-2xl border border-app bg-tint-1 p-6">
          <Lightbulb size={18} className="text-yellow-300" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t.hub.tips}</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-on-surface-variant">
            {t.hub.tips_items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </article>

        <article className="md:col-span-6 rounded-2xl border border-app bg-tint-1 p-6">
          <Trophy size={18} className="text-violet-300" />
          <h3 className="mt-3 font-display text-lg font-semibold">{t.hub.forge_news_title}</h3>
          <p className="mt-2 text-sm text-on-surface-variant">{t.hub.forge_news_body}</p>
          <button className="btn-primary mt-5">
            <MessageCircle size={13} /> {t.hub.summarize}
          </button>
        </article>

        <article className="md:col-span-6 rounded-2xl border border-app bg-tint-1 p-6">
          <h3 className="font-display text-lg font-semibold">{t.hub.support}</h3>
          <p className="mt-2 text-sm text-on-surface-variant">{t.hub.support_body}</p>
          <button className="btn-ghost mt-5">{t.hub.contact}</button>
        </article>
      </div>
    </>
  );
}

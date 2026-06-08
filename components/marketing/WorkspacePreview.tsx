"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export function WorkspacePreview() {
  const t = useT();
  return (
    <section id="workspace" className="border-b border-app">
      <div className="mx-auto max-w-container px-5 py-20 md:px-margin-desktop md:py-28">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <span className="label-caps text-violet-300">{t.marketing.workspace_eyebrow}</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl text-balance">
              {t.marketing.workspace_title}
            </h2>
            <p className="mt-5 text-on-surface-variant">{t.marketing.workspace_body}</p>

            <ul className="mt-6 space-y-2 text-sm text-on-surface">
              {t.marketing.workspace_bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <Link href="/app" className="btn-primary mt-8 inline-flex">
              {t.marketing.workspace_cta} <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 bg-violet-cyan opacity-20 blur-3xl" />
            <div className="glass-strong rounded-2xl border border-app-strong p-3 shadow-elev">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3 rounded-lg bg-tint-2 p-3">
                  {[
                    t.workspace.nav.chat,
                    t.workspace.nav.repovision,
                    t.workspace.nav.deployments,
                    t.workspace.nav.marketplace,
                    t.workspace.nav.integrations,
                    t.workspace.nav.secrets,
                    t.workspace.nav.projects,
                    t.workspace.nav.hub,
                  ].map((l, i) => (
                    <div
                      key={l}
                      className={`mb-1 truncate rounded px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                        i === 0
                          ? "bg-violet-500/15 text-violet-100"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div className="col-span-6 rounded-lg bg-tint-2 p-4">
                  <p className="label-caps mb-2 text-muted">{t.common.label_b} · {t.common.label_operator}</p>
                  <div className="space-y-2 text-[13px]">
                    <div className="rounded-md border border-app-strong bg-tint-1 p-2 text-on-surface-variant">
                      {t.chat.quick_prompts[1]}
                    </div>
                    <div className="rounded-md border border-violet-500/20 bg-violet-500/[0.08] p-2 text-on-surface">
                      {t.chat.b_response_text}
                    </div>
                    <div className="rounded-md border border-app-strong bg-tint-1 p-2 text-on-surface-variant">
                      {t.chat.quick_prompts[3]}
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-app-strong bg-tint-2 p-2 font-mono text-[12px] text-on-surface-variant">
                    <span className="text-cyber-cyan">›</span> {t.chat.placeholder}
                  </div>
                </div>
                <div className="col-span-3 rounded-lg bg-tint-2 p-3">
                  <p className="label-caps mb-2 text-muted">{t.chat.ops.title}</p>
                  {[
                    { k: t.chat.ops.build, v: "42s", c: "text-cyber-cyan" },
                    { k: t.common.status_healthy, v: t.common.status_ready, c: "text-success-emerald" },
                    { k: t.chat.ops.errors, v: "0", c: "text-on-surface" },
                    { k: "Latency", v: "84ms", c: "text-violet-300" },
                  ].map((m) => (
                    <div key={m.k} className="mb-2 rounded border border-app px-2 py-1.5">
                      <p className="label-caps text-muted">{m.k}</p>
                      <p className={`font-display text-sm font-semibold ${m.c}`}>{m.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

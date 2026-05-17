"use client";

import { PageHeader } from "@/components/workspace/PageHeader";
import { ArrowRight, CheckCircle2, CircleDot, GitBranch, GitCommit, GitPullRequest } from "lucide-react";
import { useT, interpolate } from "@/i18n/AppProviders";

type Repo = {
  name: string;
  description: string;
  env: "production" | "preview" | "staging";
  branch: string;
  build: "ok" | "running" | "failed";
  lastDeploy: string;
  commits: { msg: string; author: string; time: string }[];
};

export default function RepoVisionPage() {
  const t = useT();
  const repos: Repo[] = [
    {
      name: "orion-web",
      description: "PWA cliente · Next.js · Tailwind",
      env: "production",
      branch: "main",
      build: "ok",
      lastDeploy: "12m",
      commits: [
        { msg: "feat: stripe checkout component", author: "V", time: "12m" },
        { msg: "chore: bump @clerk/nextjs", author: "V", time: "1h" },
        { msg: "design: cinematic hero", author: "you", time: "3h" },
      ],
    },
    {
      name: "orion-api",
      description: "REST API · Node · Postgres",
      env: "preview",
      branch: "feat/bookings",
      build: "running",
      lastDeploy: "4m",
      commits: [
        { msg: "feat: bookings endpoint", author: "V", time: "4m" },
        { msg: "db: bookings migration", author: "V", time: "5m" },
      ],
    },
    {
      name: "orion-jobs",
      description: "Background queues · Cron · Webhooks",
      env: "staging",
      branch: "main",
      build: "ok",
      lastDeploy: "2h",
      commits: [{ msg: "feat: nightly backup", author: "V", time: "2h" }],
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.repovision.eyebrow}
        title={t.repovision.title}
        description={t.repovision.body}
        actions={
          <>
            <button className="btn-ghost">{t.repovision.cta_connect}</button>
            <button className="btn-primary">{t.repovision.cta_refactor}</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 md:p-8 xl:grid-cols-3">
        {repos.map((r) => (
          <article
            key={r.name}
            className="rounded-xl border border-app bg-tint-1 p-5 transition hover:border-violet-500/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">{r.name}</h3>
                <p className="text-sm text-on-surface-variant">{r.description}</p>
              </div>
              <EnvBadge env={r.env} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">
              <span className="chip"><GitBranch size={11} /> {r.branch}</span>
              <BuildBadge state={r.build} />
              <span className="chip">{interpolate(t.repovision.last_deploy, { time: r.lastDeploy })}</span>
            </div>

            <div className="mt-5">
              <p className="label-caps mb-2 text-muted">{t.repovision.recent_commits}</p>
              <ul className="space-y-2 text-[13px]">
                {r.commits.map((c) => (
                  <li key={c.msg} className="flex items-start gap-2">
                    <GitCommit size={13} className="mt-0.5 text-on-surface-variant" />
                    <div className="flex-1">
                      <p className="text-on-surface">{c.msg}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                        {c.author} · {c.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-app pt-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <GitPullRequest size={14} />
                <span className="font-mono text-[11px] uppercase tracking-widest">
                  {interpolate(t.repovision.open_prs, { count: 2 })}
                </span>
              </div>
              <button className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-cyber-cyan hover:text-cyan-400">
                {t.repovision.open} <ArrowRight size={12} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EnvBadge({ env }: { env: "production" | "preview" | "staging" }) {
  const t = useT();
  const map: Record<typeof env, string> = {
    production: "bg-success-emerald/10 text-success-emerald ring-success-emerald/30",
    preview: "bg-cyan-400/10 text-cyber-cyan ring-cyan-400/30",
    staging: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
  };
  const labels: Record<typeof env, string> = {
    production: t.common.status_live,
    preview: t.common.status_preview,
    staging: "staging",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ring-1 ${map[env]}`}
    >
      ● {labels[env]}
    </span>
  );
}

function BuildBadge({ state }: { state: "ok" | "running" | "failed" }) {
  const t = useT();
  if (state === "running")
    return (
      <span className="chip text-cyber-cyan">
        <CircleDot size={11} className="animate-pulse" /> {t.common.status_building}
      </span>
    );
  if (state === "failed") return <span className="chip text-error-crimson">● {t.common.status_failed}</span>;
  return (
    <span className="chip text-success-emerald">
      <CheckCircle2 size={11} /> {t.common.status_ready}
    </span>
  );
}

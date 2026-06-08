"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Cpu,
  GitBranch,
  Globe2,
  Layers,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

export function OperatorPreview() {
  const t = useT();
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="absolute -inset-8 -z-10 bg-violet-cyan opacity-20 blur-[80px]" />
      <div className="glass-strong overflow-hidden rounded-xl shadow-elev sm:rounded-2xl">
        {/* Window chrome */}
        <div className="flex items-center justify-between gap-2 border-b border-app px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2 w-2 rounded-full bg-error-crimson/70 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-yellow-400/70 sm:h-2.5 sm:w-2.5" />
            <span className="h-2 w-2 rounded-full bg-success-emerald/70 sm:h-2.5 sm:w-2.5" />
          </div>
          <div className="hidden truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block sm:text-[11px] sm:tracking-[0.18em]">
            vforge://workspace/orion
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyber-cyan sm:text-[11px] sm:tracking-[0.18em]">
            ● {t.common.status_live}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* Sidebar */}
          <div className="col-span-3 hidden border-r border-app bg-tint-2 p-4 md:block">
            <p className="label-caps mb-3 text-muted">{t.workspace.workspace_label}</p>
            {[
              { icon: Sparkles, label: t.workspace.nav.chat, active: true },
              { icon: GitBranch, label: t.workspace.nav.repovision },
              { icon: Activity, label: t.workspace.nav.deployments },
              { icon: Layers, label: t.workspace.nav.marketplace },
              { icon: ShieldCheck, label: t.workspace.nav.secrets },
              { icon: Globe2, label: "Domains" },
              { icon: Workflow, label: t.workspace.nav.projects },
            ].map((i) => (
              <div
                key={i.label}
                className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  i.active
                    ? "bg-violet-500/15 text-violet-100 ring-1 ring-violet-500/30"
                    : "text-on-surface-variant"
                }`}
              >
                <i.icon size={14} />
                {i.label}
              </div>
            ))}
          </div>

          {/* Center conversation */}
          <div className="col-span-12 p-4 sm:p-5 md:col-span-6 md:p-7">
            <p className="label-caps mb-4 text-muted">{t.common.label_b} · {t.common.label_operator}</p>
            <Bubble role="user">{t.chat.quick_prompts[0]}</Bubble>
            <Bubble role="b" delay={0.2}>
              {t.chat.b_response_text}
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {t.chat.b_response_actions.map((label, idx) => (
                  <li key={label} className="flex items-center gap-2 text-on-surface">
                    {idx === 0 ? (
                      <CheckCircle2 size={14} className="text-success-emerald" />
                    ) : idx === 1 ? (
                      <CheckCircle2 size={14} className="text-success-emerald" />
                    ) : idx === 2 ? (
                      <CircleDot size={14} className="animate-pulse text-cyber-cyan" />
                    ) : (
                      <CircleDot size={14} className="text-muted" />
                    )}
                    <span className={idx >= 3 ? "text-on-surface-variant" : ""}>{label}</span>
                  </li>
                ))}
              </ul>
            </Bubble>

            <div className="mt-5 rounded-lg border border-app-strong bg-tint-2 p-3">
              <div className="font-mono text-[12px] text-on-surface-variant">
                <span className="text-cyber-cyan">›</span> {t.chat.placeholder}
              </div>
            </div>
          </div>

          {/* Right ops */}
          <div className="col-span-12 border-t border-app p-4 sm:p-5 md:col-span-3 md:border-l md:border-t-0 md:p-6">
            <p className="label-caps mb-4 text-muted">{t.chat.ops.title}</p>
            <Stat label={t.chat.ops.deploys} value="2/2" hint="Production" />
            <Stat label={t.chat.ops.build} value="42s" hint="Vercel · iad1" tone="cyan" />
            <Stat label={t.workspace.nav.integrations} value="6" hint={t.common.status_healthy} tone="violet" />
            <Stat label={t.workspace.nav.secrets} value="14" hint="AES-256" />

            <div className="mt-5 rounded-md border border-app-strong bg-tint-2 p-3">
              <p className="label-caps mb-2 text-muted">{t.chat.ops.recent}</p>
              <ActivityItem icon={GitBranch} label={t.chat.ops.events[0]} tone="violet" />
              <ActivityItem icon={Cpu} label={t.chat.ops.events[1]} tone="cyan" />
              <ActivityItem icon={Globe2} label={t.chat.ops.events[2]} tone="emerald" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
  delay = 0,
}: {
  role: "user" | "b";
  children: React.ReactNode;
  delay?: number;
}) {
  const isB = role === "b";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`mb-3 max-w-[90%] rounded-xl border px-4 py-3 text-[14px] leading-relaxed ${
        isB
          ? "ml-0 border-violet-500/20 bg-violet-500/[0.06] text-on-surface"
          : "ml-auto border-app-strong bg-tint-1 text-on-surface-variant"
      }`}
    >
      {isB && (
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">
          V
        </p>
      )}
      {children}
    </motion.div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "cyan" | "violet";
}) {
  const dotClass =
    tone === "cyan"
      ? "bg-cyber-cyan shadow-[0_0_10px_rgba(34,211,238,0.6)]"
      : tone === "violet"
      ? "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
      : "bg-success-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-app bg-tint-1 px-3 py-2.5">
      <div>
        <p className="label-caps text-muted">{label}</p>
        <p className="font-display text-lg font-semibold text-on-surface">{value}</p>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {hint}
      </div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  label,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  tone: "violet" | "cyan" | "emerald";
}) {
  const c =
    tone === "violet"
      ? "text-violet-300"
      : tone === "cyan"
      ? "text-cyber-cyan"
      : "text-success-emerald";
  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px] text-on-surface-variant">
      <Icon size={12} className={c} />
      <span className="truncate font-mono">{label}</span>
    </div>
  );
}

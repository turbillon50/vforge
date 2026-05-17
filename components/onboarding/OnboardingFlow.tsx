"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Github,
  Globe2,
  Database,
  CreditCard,
  Phone,
  MapPin,
  Sparkles,
  Info,
  Rocket,
} from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";
import { useT, interpolate } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

type IntegrationKey = "github" | "vercel" | "domains" | "neon" | "stripe" | "twilio" | "maps";

const integrationOrder: { id: IntegrationKey; icon: LucideIcon; required?: boolean }[] = [
  { id: "github", icon: Github, required: true },
  { id: "vercel", icon: Rocket, required: true },
  { id: "domains", icon: Globe2 },
  { id: "neon", icon: Database },
  { id: "stripe", icon: CreditCard },
  { id: "twilio", icon: Phone },
  { id: "maps", icon: MapPin },
];

type Step = "welcome" | "profile" | "connect" | "first-project" | "summary";

export function OnboardingFlow() {
  const t = useT();
  const [step, setStep] = useState<Step>("welcome");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(t.onboarding.profile_roles[0]);
  const [projectName, setProjectName] = useState("Orion Studio");
  const [intent, setIntent] = useState("");

  const order: Step[] = ["welcome", "profile", "connect", "first-project", "summary"];
  const stepIndex = order.indexOf(step);
  const progress = ((stepIndex + 1) / order.length) * 100;

  const goNext = () => setStep(order[Math.min(stepIndex + 1, order.length - 1)]);
  const goBack = () => setStep(order[Math.max(stepIndex - 1, 0)]);

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-10 md:px-0">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/"><VWordmark /></Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {interpolate(t.onboarding.step_progress, { current: stepIndex + 1, total: order.length })}
          </span>
          <LocaleToggle compact />
          <ThemeToggle compact />
        </div>
      </div>

      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-tint-2">
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="glass-strong rounded-2xl p-8 md:p-10"
        >
          {step === "welcome" && <Welcome onContinue={goNext} />}

          {step === "profile" && (
            <Profile
              name={name}
              setName={setName}
              role={role}
              setRole={setRole}
            />
          )}

          {step === "connect" && (
            <Connect
              connected={connected}
              onToggle={(id) => setConnected((p) => ({ ...p, [id]: !p[id] }))}
            />
          )}

          {step === "first-project" && (
            <FirstProject
              projectName={projectName}
              setProjectName={setProjectName}
              intent={intent}
              setIntent={setIntent}
            />
          )}

          {step === "summary" && (
            <Summary name={name} project={projectName} connected={connected} />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={goBack} disabled={stepIndex === 0} className="btn-ghost disabled:opacity-30">
          <ArrowLeft size={14} /> {t.common.cta_back}
        </button>
        {step !== "summary" ? (
          <button onClick={goNext} className="btn-primary">
            {t.common.cta_continue} <ArrowRight size={14} />
          </button>
        ) : (
          <Link href="/app" className="btn-primary">
            {t.onboarding.enter_workspace} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  const t = useT();
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/30 animate-breathe">
        <Sparkles className="text-cyber-cyan" size={22} />
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl text-balance">
        {t.onboarding.welcome_title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-on-surface-variant">{t.onboarding.welcome_body}</p>
      <button onClick={onContinue} className="btn-primary mt-8">
        {t.onboarding.welcome_cta} <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Profile({
  name,
  setName,
  role,
  setRole,
}: {
  name: string;
  setName: (s: string) => void;
  role: string;
  setRole: (s: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t.onboarding.profile_title}</h2>
      <p className="mt-2 text-on-surface-variant">{t.onboarding.profile_body}</p>

      <div className="mt-7 grid gap-5">
        <label className="block">
          <span className="label-caps text-muted">{t.onboarding.profile_name_label}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.onboarding.profile_name_placeholder}
            className="input-base mt-2"
          />
        </label>

        <div>
          <span className="label-caps text-muted">{t.onboarding.profile_role_label}</span>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.onboarding.profile_roles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  role === r
                    ? "border-violet-400/50 bg-violet-500/15 text-violet-300"
                    : "border-app-strong text-on-surface-variant hover:border-app-strong/80"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Connect({
  connected,
  onToggle,
}: {
  connected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t.onboarding.connect_title}</h2>
      <p className="mt-2 text-on-surface-variant">{t.onboarding.connect_body}</p>

      <div className="mt-7 grid gap-3">
        {integrationOrder.map(({ id, icon: Icon, required }) => {
          const meta = t.onboarding.integrations[id];
          const isOn = !!connected[id];
          return (
            <div key={id} className="rounded-xl border border-app bg-tint-1 p-4 transition hover:border-app-strong">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isOn
                      ? "bg-success-emerald/15 text-success-emerald ring-1 ring-success-emerald/30"
                      : "bg-tint-2 text-on-surface-variant"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold">{meta.name}</p>
                    {required && <span className="chip">{t.onboarding.label_recommended}</span>}
                  </div>
                  <p className="text-sm text-on-surface-variant">{meta.blurb}</p>
                </div>
                <button
                  onClick={() => setOpen(open === id ? null : id)}
                  className="rounded-md p-2 text-muted hover:bg-tint-2 hover:text-on-surface"
                  aria-label={`Glossary: ${meta.name}`}
                >
                  <Info size={16} />
                </button>
                <button onClick={() => onToggle(id)} className={isOn ? "btn-ghost" : "btn-primary"}>
                  {isOn ? (
                    <>
                      <CheckCircle2 size={14} className="text-success-emerald" /> {t.onboarding.label_connected}
                    </>
                  ) : (
                    t.common.cta_connect
                  )}
                </button>
              </div>

              <AnimatePresence>
                {open === id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/[0.04] p-3 text-sm text-on-surface-variant">
                      <span className="label-caps mr-2 text-cyber-cyan">{t.onboarding.glossary_label}</span>
                      {meta.glossary}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FirstProject({
  projectName,
  setProjectName,
  intent,
  setIntent,
}: {
  projectName: string;
  setProjectName: (s: string) => void;
  intent: string;
  setIntent: (s: string) => void;
}) {
  const t = useT();
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t.onboarding.project_title}</h2>
      <p className="mt-2 text-on-surface-variant">{t.onboarding.project_body}</p>

      <div className="mt-7 grid gap-5">
        <label className="block">
          <span className="label-caps text-muted">{t.onboarding.project_name_label}</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="input-base mt-2"
            placeholder={t.onboarding.project_name_placeholder}
          />
        </label>
        <label className="block">
          <span className="label-caps text-muted">{t.onboarding.project_intent_label}</span>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder={t.onboarding.project_intent_placeholder}
            rows={5}
            className="input-base mt-2 resize-none"
          />
        </label>
        <div className="rounded-md border border-violet-400/20 bg-violet-500/[0.06] p-4 text-sm text-on-surface">
          <span className="label-caps mr-2 text-violet-300">{t.common.label_b}</span>
          {t.onboarding.project_b_note}
        </div>
      </div>
    </div>
  );
}

function Summary({
  name,
  project,
  connected,
}: {
  name: string;
  project: string;
  connected: Record<string, boolean>;
}) {
  const t = useT();
  const ok = Object.keys(connected).filter((k) => connected[k]);
  const title = name
    ? interpolate(t.onboarding.summary_title_named, { name })
    : t.onboarding.summary_title_anon;
  const body = interpolate(t.onboarding.summary_body, {
    project: project || t.onboarding.summary_project_fallback,
  });
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-emerald/10 ring-1 ring-success-emerald/30">
        <CheckCircle2 size={22} className="text-success-emerald" />
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-on-surface-variant">{body}</p>

      <div className="mx-auto mt-7 max-w-md rounded-xl border border-app-strong bg-tint-1 p-5 text-left">
        <p className="label-caps mb-3 text-muted">{t.onboarding.summary_connected}</p>
        {integrationOrder.map(({ id, icon: Icon }) => {
          const meta = t.onboarding.integrations[id];
          const isOn = ok.includes(id);
          return (
            <div key={id} className="flex items-center justify-between border-b border-app py-2 text-sm last:border-0">
              <span className="flex items-center gap-2 text-on-surface">
                <Icon size={14} className="text-on-surface-variant" /> {meta.name}
              </span>
              {isOn ? (
                <span className="flex items-center gap-1.5 text-success-emerald">
                  <CheckCircle2 size={12} /> {t.onboarding.summary_ready}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted">
                  <Circle size={12} /> {t.onboarding.summary_later}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

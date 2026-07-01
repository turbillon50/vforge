"use client";
import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IconArrowL, IconArrowR, IconBell, IconCheck, IconCircle, IconCreditCard, IconDatabase, IconExtLink, IconEye, IconGithub, IconGlobe, IconInfo, IconLoader, IconMap, IconRocket, IconSparkles, IconX } from "@/components/brand/VFIcons";
import { VWordmark } from "@/components/brand/VMark";
import { useT, interpolate } from "@/i18n/AppProviders";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { LocaleToggle } from "@/components/controls/LocaleToggle";

type IntegrationKey = "github" | "vercel" | "domains" | "neon" | "stripe" | "twilio" | "maps";

const integrationOrder: { id: IntegrationKey; icon: (props: {size?: number; className?: string; [key: string]: unknown}) => React.ReactElement | null; required?: boolean }[] = [
  { id: "github", icon: IconGithub, required: true },
  { id: "vercel", icon: IconRocket, required: true },
  { id: "domains", icon: IconGlobe },
  { id: "neon", icon: IconDatabase },
  { id: "stripe", icon: IconCreditCard },
  { id: "twilio", icon: IconBell },
  { id: "maps", icon: IconMap },
];

// Formato de llave esperado por cada servicio — guía visual inline, sin window.prompt.
const serviceHints: Record<
  IntegrationKey,
  { placeholder: string; second?: { label: string; placeholder: string } }
> = {
  github: { placeholder: "ghp_... o github_pat_..." },
  vercel: { placeholder: "Token de Vercel (Bearer)" },
  domains: { placeholder: "API token de tu registrador" },
  neon: { placeholder: "postgresql://..." },
  stripe: { placeholder: "sk_live_... o sk_test_..." },
  twilio: {
    placeholder: "AC... (Account SID)",
    second: { label: "Auth Token", placeholder: "Tu Auth Token de Twilio" },
  },
  maps: { placeholder: "AIza..." },
};

type Step = "welcome" | "profile" | "connect" | "first-project" | "summary";

export function OnboardingFlow() {
  const t = useT();
  const [step, setStep] = useState<Step>("welcome");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [secondValues, setSecondValues] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(t.onboarding.profile_roles[0]);
  const [projectName, setProjectName] = useState("Orion Studio");
  const [intent, setIntent] = useState("");
  const [finishing, setFinishing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("connected")) setStep("connect");
    let alive = true;
    fetch("/api/onboarding/status")
      .then((r) => (r.ok ? r.json() : { connected: [] }))
      .then((d) => {
        if (!alive) return;
        const list: string[] = Array.isArray(d.connected) ? d.connected : [];
        if (list.length)
          setConnected((p) => ({ ...p, ...Object.fromEntries(list.map((x) => [x, true])) }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [searchParams]);

  // Cierre del onboarding: marca el flag en Clerk (el middleware lo usa para
  // dejar de mandar al usuario a /onboarding) y entra al workspace con un saludo
  // de V personalizado. Si la marca falla, igual entramos: el workspace es la
  // experiencia correcta y no dejamos al usuario atorado en el resumen.
  const finishOnboarding = async () => {
    if (finishing) return;
    setFinishing(true);
    const services = Object.values(connected).filter(Boolean).length;
    try {
      await fetch("/api/user/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role, services }),
      });
    } catch {
      /* la marca es best-effort; entramos igual */
    }
    const q = new URLSearchParams({
      welcome: "1",
      name: name.trim(),
      svc: String(services),
    });
    router.push("/workspace");
  };

  const order: Step[] = ["welcome", "profile", "connect", "first-project", "summary"];
  const stepIndex = order.indexOf(step);
  const progress = ((stepIndex + 1) / order.length) * 100;

  const goNext = () => setStep(order[Math.min(stepIndex + 1, order.length - 1)]);
  const goBack = () => setStep(order[Math.max(stepIndex - 1, 0)]);

  const setInput = (id: string, v: string) =>
    setInputValues((p) => ({ ...p, [id]: v }));
  const setSecond = (id: string, v: string) =>
    setSecondValues((p) => ({ ...p, [id]: v }));

  const disconnectService = (id: string) => {
    setConnected((p) => ({ ...p, [id]: false }));
    setAccounts((p) => { const n = { ...p }; delete n[id]; return n; });
    setInput(id, ""); setSecond(id, "");
    setErrors((p) => ({ ...p, [id]: "" }));
  };

  // Conexión inline: lee inputValues[id], valida en vivo contra el servicio.
  const connectService = async (id: string) => {
    const key = (inputValues[id] ?? "").trim();
    const hint = serviceHints[id as IntegrationKey];
    let payloadKey = key;
    if (hint?.second) {
      const token = (secondValues[id] ?? "").trim();
      if (!key || !token) {
        setErrors((p) => ({ ...p, [id]: "Faltan el Account SID y el Auth Token" }));
        return;
      }
      payloadKey = `${key}:${token}`;
    } else if (!key) {
      setErrors((p) => ({ ...p, [id]: "Pega tu llave primero" }));
      return;
    }
    setLoading((p) => ({ ...p, [id]: true }));
    setErrors((p) => ({ ...p, [id]: "" }));
    try {
      const r = await fetch("/api/onboarding/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: id, key: payloadKey }),
      });
      const d = await r.json();
      if (d.ok) {
        setConnected((p) => ({ ...p, [id]: true }));
        setAccounts((p) => ({ ...p, [id]: d.account ?? "" }));
        setInput(id, ""); setSecond(id, "");
      } else {
        setErrors((p) => ({ ...p, [id]: d.error || "Llave inválida" }));
      }
    } catch {
      setErrors((p) => ({ ...p, [id]: "Error de conexión, intenta de nuevo." }));
    } finally {
      setLoading((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-10 md:px-0">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/workspace"><VWordmark /></Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {interpolate(t.onboarding.step_progress, { current: stepIndex + 1, total: order.length })}
          </span>
          <LocaleToggle compact />
          <ThemeToggle compact />
          <button onClick={finishOnboarding} className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition hover:text-[var(--fg-primary)]">Entrar &rarr;</button>
        </div>
      </div>

      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-tint-2/[0.08]">
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="h-full bg-gradient-to-r from-violet-500 via-violet-400 to-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.5)]"
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
              accounts={accounts}
              inputValues={inputValues}
              secondValues={secondValues}
              showKey={showKey}
              loading={loading}
              errors={errors}
              setInput={setInput}
              setSecond={setSecond}
              toggleShow={(id) => setShowKey((p) => ({ ...p, [id]: !p[id] }))}
              onConnect={connectService}
              onDisconnect={disconnectService}
            />
          )}

          {step === "first-project" && (
            <FirstProject
              projectName={projectName}
              setProjectName={setProjectName}
              intent={intent}
              setIntent={setIntent}
              githubConnected={!!connected.github}
              githubAccount={accounts.github}
            />
          )}

          {step === "summary" && (
            <Summary name={name} project={projectName} connected={connected} />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={goBack} disabled={stepIndex === 0} className="btn-ghost disabled:opacity-30">
          <IconArrowL size={14} /> {t.common.cta_back}
        </button>
        {step !== "summary" ? (
          <button onClick={goNext} className="btn-primary">
            {t.common.cta_continue} <IconArrowR size={14} />
          </button>
        ) : (
          <button
            onClick={finishOnboarding}
            disabled={finishing}
            className="btn-primary disabled:opacity-60"
          >
            {finishing ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <>
                {t.onboarding.enter_workspace} <IconArrowR size={14} />
              </>
            )}
          </button>
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
        <IconSparkles className="text-violet-400" size={22} />
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl text-balance">
        {t.onboarding.welcome_title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-on-surface-variant">{t.onboarding.welcome_body}</p>
      <button onClick={onContinue} className="btn-primary mt-8">
        {t.onboarding.welcome_cta} <IconArrowR size={14} />
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
  accounts,
  inputValues,
  secondValues,
  showKey,
  loading,
  errors,
  setInput,
  setSecond,
  toggleShow,
  onConnect,
  onDisconnect,
}: {
  connected: Record<string, boolean>;
  accounts: Record<string, string>;
  inputValues: Record<string, string>;
  secondValues: Record<string, string>;
  showKey: Record<string, boolean>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  setInput: (id: string, v: string) => void;
  setSecond: (id: string, v: string) => void;
  toggleShow: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}) {
  const t = useT();
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [openInput, setOpenInput] = useState<string | null>(null);

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{t.onboarding.connect_title}</h2>
      <p className="mt-2 text-on-surface-variant">{t.onboarding.connect_body}</p>

      <div className="mt-7 grid gap-3">
        {integrationOrder.map(({ id, icon: Icon, required }) => {
          const meta = t.onboarding.integrations[id];
          const hint = serviceHints[id];
          const isOn = !!connected[id];
          const isOpen = openInput === id;
          const isBusy = !!loading[id];
          const error = errors[id];
          return (
            <div key={id} className="rounded-xl border border-app bg-tint-1/[0.05] p-4 transition hover:border-app-strong">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isOn
                      ? "bg-success-emerald/15 text-success-emerald ring-1 ring-success-emerald/30"
                      : "bg-tint-2/[0.08] text-on-surface-variant"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-semibold">{meta.name}</p>
                    {required && <span className="chip">{t.onboarding.label_recommended}</span>}
                  </div>
                  {isOn ? (
                    <p className="flex items-center gap-1.5 truncate text-sm text-success-emerald">
                      <IconCheck size={13} /> {accounts[id] ? accounts[id] : t.onboarding.label_connected}
                    </p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">{meta.blurb}</p>
                  )}
                </div>
                <button
                  onClick={() => setOpenInfo(openInfo === id ? null : id)}
                  className="rounded-md p-2 text-muted hover:bg-tint-2/[0.08] hover:text-on-surface"
                  aria-label={`Glossary: ${meta.name}`}
                >
                  <IconInfo size={16} />
                </button>
                {isOn ? (
                  <button onClick={() => onDisconnect(id)} className="btn-ghost">
                    <IconCheck size={14} className="text-success-emerald" /> {t.onboarding.label_connected}
                  </button>
                ) : (
                  <button
                    onClick={() => { if (id === "github" || id === "vercel" || id === "stripe") { window.location.href = "/api/auth/" + id + "/start"; } else { setOpenInput(isOpen ? null : id); } }}
                    className={isOpen ? "btn-ghost" : "btn-primary"}
                  >
                    {isOpen ? (
                      <>
                        <IconX size={14} /> Cancelar
                      </>
                    ) : (
                      t.common.cta_connect
                    )}
                  </button>
                )}
              </div>

              {/* Input inline elegante — reemplaza window.prompt() */}
              <AnimatePresence>
                {isOpen && !isOn && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 grid gap-3 rounded-lg border border-app-strong bg-tint-2/40 p-4">
                      <label className="block">
                        <span className="label-caps text-muted">Tu API key de {meta.name}</span>
                        <div className="relative mt-2">
                          <input
                            type={showKey[id] ? "text" : "password"}
                            value={inputValues[id] ?? ""}
                            onChange={(e) => setInput(id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !isBusy) onConnect(id); }}
                            placeholder={hint.placeholder}
                            autoComplete="off"
                            spellCheck={false}
                            className="input-base w-full pr-11 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShow(id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-tint-2/[0.08] hover:text-on-surface"
                            aria-label={showKey[id] ? "Ocultar" : "Mostrar"}
                          >
                            <IconEye size={16} />
                          </button>
                        </div>
                      </label>

                      {hint.second && (
                        <label className="block">
                          <span className="label-caps text-muted">{hint.second.label}</span>
                          <input
                            type={showKey[id] ? "text" : "password"}
                            value={secondValues[id] ?? ""}
                            onChange={(e) => setSecond(id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !isBusy) onConnect(id); }}
                            placeholder={hint.second.placeholder}
                            autoComplete="off"
                            spellCheck={false}
                            className="input-base mt-2 w-full font-mono text-sm"
                          />
                        </label>
                      )}

                      {error && (
                        <p className="flex items-center gap-1.5 text-sm text-rose-400">
                          <IconX size={13} /> {error}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted">La validamos en vivo contra el servicio.</span>
                        <button
                          onClick={() => onConnect(id)}
                          disabled={isBusy}
                          className="btn-primary disabled:opacity-60"
                        >
                          {isBusy ? (
                            <>
                              <IconLoader size={14} className="animate-spin" /> Conectando…
                            </>
                          ) : (
                            <>
                              {t.common.cta_connect} <IconArrowR size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {openInfo === id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-md border border-violet-400/20 bg-violet-400/[0.04] p-3 text-sm text-on-surface-variant">
                      <span className="label-caps mr-2 text-violet-400">{t.onboarding.glossary_label}</span>
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

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "proyecto"
  );
}

function FirstProject({
  projectName,
  setProjectName,
  intent,
  setIntent,
  githubConnected,
  githubAccount,
}: {
  projectName: string;
  setProjectName: (s: string) => void;
  intent: string;
  setIntent: (s: string) => void;
  githubConnected: boolean;
  githubAccount?: string;
}) {
  const t = useT();
  const [optIn, setOptIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [repo, setRepo] = useState<{ url: string; name: string } | null>(null);
  const [repoError, setRepoError] = useState("");

  const createRepo = async () => {
    setCreating(true);
    setRepoError("");
    try {
      const id = slugify(projectName);
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: projectName.trim() || id, create_repo: true }),
      });
      const d = await r.json();
      if (!r.ok) {
        setRepoError(d.error || "No se pudo crear el proyecto");
      } else if (d.github_url) {
        setRepo({ url: d.github_url, name: d.github_repo || id });
      } else {
        setRepoError(d.repo_error || "El proyecto se creó pero GitHub no devolvió el repo");
      }
    } catch {
      setRepoError("Error de conexión al crear el repo");
    } finally {
      setCreating(false);
    }
  };

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

        {/* Parte 3 — crear repo en GitHub al vuelo si hay GitHub conectado */}
        {githubConnected && (
          <div className="rounded-xl border border-app-strong bg-tint-1/[0.05] p-4">
            {repo ? (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-emerald/15 text-success-emerald ring-1 ring-success-emerald/30">
                  <IconCheck size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-success-emerald">Repo creado</p>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate font-mono text-sm text-violet-400 hover:underline"
                  >
                    {repo.name} <IconExtLink size={12} />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setOptIn((v) => !v)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span
                    className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                      optIn ? "bg-violet-500" : "bg-tint-3/[0.10]"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow transition ${optIn ? "translate-x-5" : ""}`}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <IconGithub size={16} className="shrink-0 text-on-surface-variant" />
                    <span className="text-sm text-on-surface">
                      ¿Creamos el repo en GitHub ahora?
                      {githubAccount ? <span className="text-muted"> ({githubAccount})</span> : null}
                    </span>
                  </span>
                </button>

                <AnimatePresence>
                  {optIn && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-app pt-3">
                        <span className="font-mono text-xs text-muted">{slugify(projectName)}</span>
                        <button
                          onClick={createRepo}
                          disabled={creating}
                          className="btn-primary disabled:opacity-60"
                        >
                          {creating ? (
                            <>
                              <IconLoader size={14} className="animate-spin" /> Creando…
                            </>
                          ) : (
                            <>
                              <IconGithub size={14} /> Crear repo
                            </>
                          )}
                        </button>
                      </div>
                      {repoError && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-400">
                          <IconX size={13} /> {repoError}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}

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
        <IconCheck size={22} className="text-success-emerald" />
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-on-surface-variant">{body}</p>

      <div className="mx-auto mt-7 max-w-md rounded-xl border border-app-strong bg-tint-1/[0.05] p-5 text-left">
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
                  <IconCheck size={12} /> {t.onboarding.summary_ready}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-muted">
                  <IconCircle size={12} /> {t.onboarding.summary_later}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

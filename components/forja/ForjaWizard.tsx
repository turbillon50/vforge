"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconGithub,
  IconRocket,
  IconDatabase,
  IconKey,
  IconCheck,
  IconX,
  IconLoader,
  IconShield,
  IconArrowR,
  IconWarn,
  IconExtLink,
} from "@/components/brand/VFIcons";

type Service = "github" | "vercel" | "neon";
type ConnStatus = "missing" | "unverified" | "verified" | "error";

interface Connection {
  service: Service;
  status: ConnStatus;
  identity: string | null;
  lastError: string | null;
}

interface StatusPayload {
  sphere: { id: string; name: string; status: string; activatedAt: string | null };
  connections: Connection[];
  verifiedCount: number;
  requiredCount: number;
  canActivate: boolean;
}

const META: Record<
  Service,
  { label: string; Icon: typeof IconGithub; help: string; href: string; placeholder: string }
> = {
  github: {
    label: "GitHub",
    Icon: IconGithub,
    help: "Personal Access Token (classic o fine-grained) con acceso a tus repos.",
    href: "https://github.com/settings/tokens",
    placeholder: "ghp_… o github_pat_…",
  },
  vercel: {
    label: "Vercel",
    Icon: IconRocket,
    help: "Token de cuenta para desplegar en TU Vercel.",
    href: "https://vercel.com/account/tokens",
    placeholder: "Tu Vercel token",
  },
  neon: {
    label: "Neon",
    Icon: IconDatabase,
    help: "API key de Neon para tu Postgres serverless.",
    href: "https://console.neon.tech/app/settings/api-keys",
    placeholder: "napi_…",
  },
};

const ORDER: Service[] = ["github", "vercel", "neon"];

export function ForjaWizard() {
  const router = useRouter();
  const [conns, setConns] = useState<Record<Service, Connection>>(() =>
    Object.fromEntries(
      ORDER.map((s) => [s, { service: s, status: "missing", identity: null, lastError: null }]),
    ) as Record<Service, Connection>,
  );
  const [secrets, setSecrets] = useState<Record<Service, string>>({ github: "", vercel: "", neon: "" });
  const [busy, setBusy] = useState<Service | null>(null);
  const [activating, setActivating] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sphereStatus, setSphereStatus] = useState<string>("forging");

  const hydrate = useCallback((data: StatusPayload) => {
    setConns((prev) => {
      const next = { ...prev };
      for (const c of data.connections) next[c.service] = c;
      return next;
    });
    setSphereStatus(data.sphere.status);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/forja/status", { cache: "no-store" });
        if (r.ok && alive) hydrate((await r.json()) as StatusPayload);
      } catch {
        /* estado vacío real */
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrate]);

  const verifiedCount = ORDER.filter((s) => conns[s].status === "verified").length;
  const canActivate = verifiedCount === ORDER.length;

  async function connect(service: Service) {
    const secret = secrets[service].trim();
    if (!secret || busy) return;
    setBusy(service);
    try {
      const r = await fetch("/api/forja/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, secret }),
      });
      const d = (await r.json()) as { ok: boolean; identity?: string | null; error?: string };
      setConns((prev) => ({
        ...prev,
        [service]: {
          service,
          status: d.ok ? "verified" : "error",
          identity: d.identity ?? null,
          lastError: d.ok ? null : d.error ?? "verificación fallida",
        },
      }));
      if (d.ok) setSecrets((p) => ({ ...p, [service]: "" })); // no retener el secreto en el form
    } catch {
      setConns((prev) => ({
        ...prev,
        [service]: { service, status: "error", identity: null, lastError: "error de red" },
      }));
    } finally {
      setBusy(null);
    }
  }

  async function activate() {
    if (!canActivate || activating) return;
    setActivating(true);
    try {
      const r = await fetch("/api/forja/activate", { method: "POST" });
      const d = (await r.json()) as { ok: boolean; connections?: Connection[]; status?: string };
      if (d.connections) {
        setConns((prev) => {
          const next = { ...prev };
          for (const c of d.connections!) next[c.service] = c;
          return next;
        });
      }
      if (d.ok) {
        setSphereStatus("active");
        router.push("/esfera");
      } else {
        setSphereStatus(d.status ?? "degraded");
      }
    } catch {
      /* deja el wizard como está */
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-10 md:py-14">
      {/* Encabezado */}
      <div className="mb-8">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400/70">
          Forja tu Esfera
        </p>
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">
          Conecta tu propia infraestructura
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--fg-tertiary)]">
          Tu esfera corre sobre <span className="text-[var(--fg-secondary)]">tus cuentas</span> — tú eres el dueño.
          Conecta GitHub, Vercel y Neon; verificamos cada una en vivo antes de encenderla. Cero humanos
          en el proceso.
        </p>
      </div>

      {/* Progreso */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
            initial={false}
            animate={{ width: `${(verifiedCount / ORDER.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[var(--fg-tertiary)]">
          {verifiedCount}/{ORDER.length}
        </span>
      </div>

      {/* Tarjetas de conexión */}
      <div className="space-y-3">
        {ORDER.map((service, i) => {
          const c = conns[service];
          const m = META[service];
          const verified = c.status === "verified";
          const errored = c.status === "error";
          return (
            <motion.div
              key={service}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: loaded ? 0 : i * 0.07 }}
              className={`rounded-2xl border bg-[#0c0a18]/80 p-4 backdrop-blur-xl transition-colors md:p-5 ${
                verified
                  ? "border-emerald-500/30"
                  : errored
                    ? "border-red-500/30"
                    : "border-[var(--border-1)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    verified
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)]"
                  }`}
                >
                  <m.Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-white">{m.label}</h3>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-tertiary)]">{m.help}</p>

                  {verified ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                      <IconCheck size={14} className="text-emerald-400" />
                      <span className="truncate font-mono text-[11px] text-emerald-200/80">
                        Verificado{c.identity ? ` · ${c.identity}` : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <IconKey
                            size={14}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
                          />
                          <input
                            type="password"
                            autoComplete="off"
                            spellCheck={false}
                            value={secrets[service]}
                            onChange={(e) => setSecrets((p) => ({ ...p, [service]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && connect(service)}
                            placeholder={m.placeholder}
                            className="w-full rounded-xl border border-[var(--border-1)] bg-black/40 py-2 pl-9 pr-3 font-mono text-xs text-white placeholder:text-[var(--fg-muted)] focus:border-violet-500/40 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => connect(service)}
                          disabled={busy === service || !secrets[service].trim()}
                          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy === service ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                            >
                              <IconLoader size={14} />
                            </motion.span>
                          ) : (
                            <>Verificar</>
                          )}
                        </button>
                      </div>
                      {errored && c.lastError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-300/80">
                          <IconWarn size={12} /> {c.lastError}
                        </div>
                      )}
                      <a
                        href={m.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]"
                      >
                        ¿Dónde la obtengo? <IconExtLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Baúl note */}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
        <IconShield size={15} className="mt-0.5 shrink-0 text-violet-400/70" />
        <p className="text-[11px] leading-relaxed text-[var(--fg-tertiary)]">
          Tus credenciales se guardan en el <span className="text-[var(--fg-secondary)]">Baúl</span> cifradas con una
          llave única de tu esfera (AES-256-GCM). Nunca viajan en claro ni quedan en logs.
        </p>
      </div>

      {/* Activar */}
      <div className="mt-6">
        <AnimatePresence>
          {sphereStatus === "active" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] py-3.5 text-sm font-semibold text-emerald-200"
            >
              <IconCheck size={16} /> Esfera activa — redirigiendo…
            </motion.div>
          ) : (
            <motion.button
              key="activate"
              onClick={activate}
              disabled={!canActivate || activating}
              whileTap={canActivate ? { scale: 0.98 } : undefined}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all ${
                canActivate
                  ? "bg-gradient-to-r from-violet-500 to-emerald-400 text-black shadow-[0_0_40px_rgba(124,58,237,0.35)]"
                  : "cursor-not-allowed border border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-muted)]"
              }`}
            >
              {activating ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                >
                  <IconLoader size={16} />
                </motion.span>
              ) : (
                <>
                  {canActivate ? "Activar mi Esfera" : `Conecta las ${ORDER.length} para activar`}
                  {canActivate && <IconArrowR size={16} />}
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ConnStatus }) {
  const map: Record<ConnStatus, { label: string; cls: string; Icon: typeof IconCheck | null }> = {
    verified: { label: "Conectado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", Icon: IconCheck },
    error: { label: "Error", cls: "border-red-500/30 bg-red-500/10 text-red-300", Icon: IconX },
    unverified: { label: "Sin verificar", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300", Icon: null },
    missing: { label: "Pendiente", cls: "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-tertiary)]", Icon: null },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${s.cls}`}>
      {s.Icon && <s.Icon size={10} />} {s.label}
    </span>
  );
}

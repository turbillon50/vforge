"use client";

/**
 * Wizard de scope estilo Apple TV: full-bleed, una pregunta a la vez,
 * tipografía gigante, cards grandes seleccionables, progreso por puntos.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconArrowL, IconArrowR, IconCheck, IconLoader } from "@/components/brand/VFIcons";
import type { WorkspaceScope } from "@/lib/workspace/db";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const APP_TYPES = [
  "E-commerce",
  "Servicios / Reservas",
  "Comunidad",
  "Interna / Operaciones",
  "Contenido / Media",
  "Otra",
];
const AUDIENCES = [
  "Clientes finales",
  "Mi equipo",
  "Socios / Proveedores",
  "Mixto",
];
const FEATURES = [
  "Pagos",
  "Usuarios y roles",
  "Notificaciones",
  "Chat / IA",
  "Catálogo",
  "Reportes",
  "Reservas",
  "Mapa / Logística",
];
const INTEGRATIONS = [
  "Stripe",
  "Mercado Pago",
  "WhatsApp",
  "Google",
  "GitHub",
  "Ninguna aún",
];

const TOTAL_STEPS = 5;

interface Props {
  initialScope?: WorkspaceScope | null;
}

export default function ScopeWizard({ initialScope }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [appType, setAppType] = useState(initialScope?.appType ?? "");
  const [audience, setAudience] = useState(initialScope?.audience ?? "");
  const [features, setFeatures] = useState<string[]>(
    initialScope?.features ?? [],
  );
  const [integrations, setIntegrations] = useState<string[]>(
    initialScope?.integrations ?? [],
  );
  const [projectName, setProjectName] = useState(
    initialScope?.projectName ?? "",
  );

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!appType;
      case 1:
        return !!audience;
      case 2:
        return features.length > 0;
      case 3:
        return integrations.length > 0;
      case 4:
        return projectName.trim().length >= 2;
      default:
        return false;
    }
  }, [step, appType, audience, features, integrations, projectName]);

  const go = useCallback(
    (delta: number) => {
      setError(null);
      setDir(delta);
      setStep((s) => Math.min(TOTAL_STEPS - 1, Math.max(0, s + delta)));
    },
    [],
  );

  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: {
            appType,
            audience,
            features,
            integrations,
            projectName: projectName.trim(),
          },
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "No se pudo guardar el alcance");
      }
      router.push("/workspace");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setSaving(false);
    }
  }, [saving, appType, audience, features, integrations, projectName, router]);

  // Navegación con teclado.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && canNext) {
        if (step === TOTAL_STEPS - 1) void finish();
        else go(1);
      }
      if (e.key === "Escape" && step > 0) go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, canNext, go, finish]);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    if (value === "Ninguna aún") {
      set(list.includes(value) ? [] : [value]);
      return;
    }
    const without = list.filter((v) => v !== value && v !== "Ninguna aún");
    set(list.includes(value) ? without : [...without, value]);
  }

  const questions = [
    "¿Qué tipo de app quieres construir?",
    "¿Para quién es?",
    "¿Qué necesita hacer?",
    "¿Con qué se conecta?",
    "Dale un nombre a tu proyecto",
  ];

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-void">
      {/* Fondo con firma violeta→cian */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, rgba(139,92,246,0.12), transparent 60%), radial-gradient(50% 40% at 90% 100%, rgba(34,211,238,0.1), transparent 60%)",
        }}
      />

      {/* Progreso por puntos */}
      <div className="relative z-10 flex items-center justify-center gap-2.5 pt-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? "w-7 bg-gradient-to-r from-violet-500 to-violet-400"
                : i < step
                  ? "w-1.5 bg-violet-400/70"
                  : "w-1.5 bg-tint-3"
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -48 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-violet-300">
              Paso {step + 1} de {TOTAL_STEPS}
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-on-surface sm:text-5xl md:text-6xl">
              {questions[step]}
            </h1>

            <div className="mt-10">
              {step === 0 && (
                <OptionGrid
                  options={APP_TYPES}
                  selected={[appType]}
                  onSelect={(v) => {
                    setAppType(v);
                    setTimeout(() => go(1), 220);
                  }}
                />
              )}
              {step === 1 && (
                <OptionGrid
                  options={AUDIENCES}
                  selected={[audience]}
                  onSelect={(v) => {
                    setAudience(v);
                    setTimeout(() => go(1), 220);
                  }}
                />
              )}
              {step === 2 && (
                <OptionGrid
                  options={FEATURES}
                  selected={features}
                  multi
                  onSelect={(v) => toggle(features, setFeatures, v)}
                />
              )}
              {step === 3 && (
                <OptionGrid
                  options={INTEGRATIONS}
                  selected={integrations}
                  multi
                  onSelect={(v) => toggle(integrations, setIntegrations, v)}
                />
              )}
              {step === 4 && (
                <div>
                  <input
                    autoFocus
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Mi gran app"
                    className="w-full border-b-2 border-app bg-transparent pb-3 font-display text-3xl font-medium tracking-tight text-on-surface outline-none transition-colors placeholder:text-muted focus:border-violet-500 sm:text-4xl"
                  />
                  <div className="mt-8 rounded-2xl border border-app bg-tint-1 p-6 shadow-elev">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-on-surface-variant">
                      Resumen del alcance
                    </p>
                    <dl className="mt-4 space-y-3 text-sm">
                      <SummaryRow label="Tipo" value={appType} />
                      <SummaryRow label="Público" value={audience} />
                      <SummaryRow label="Funciones" value={features.join(" · ")} />
                      <SummaryRow
                        label="Integraciones"
                        value={integrations.join(" · ")}
                      />
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-6 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={step === 0 || saving}
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-app bg-tint-1 px-5 py-2.5 text-sm text-on-surface-variant transition hover:bg-tint-2 disabled:opacity-0"
          >
            <IconArrowL className="h-4 w-4" aria-hidden />
            Atrás
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              disabled={!canNext}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-medium text-white shadow-elev transition hover:brightness-110 disabled:opacity-40"
            >
              Continuar
              <IconArrowR className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={!canNext || saving}
              className="flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-2.5 text-sm font-medium text-white shadow-elev transition hover:brightness-110 disabled:opacity-40"
            >
              {saving ? (
                <IconLoader className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <IconCheck className="h-4 w-4" aria-hidden />
              )}
              {saving ? "Guardando…" : "Crear mi workspace"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-28 shrink-0 text-muted">{label}</dt>
      <dd className="text-on-surface">{value || "—"}</dd>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  multi = false,
  onSelect,
}: {
  options: string[];
  selected: string[];
  multi?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div
      role={multi ? "group" : "radiogroup"}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {options.map((opt, i) => {
        const active = selected.includes(opt);
        return (
          <motion.button
            key={opt}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={active}
            onClick={() => onSelect(opt)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative min-h-[64px] rounded-2xl border px-6 py-5 text-left transition-all duration-200 ${
              active
                ? "border-violet-500/60 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_12px_40px_rgba(139,92,246,0.15)]"
                : "border-app bg-tint-1 hover:-translate-y-0.5 hover:bg-tint-2 hover:shadow-elev"
            }`}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />
            <span className="flex items-center justify-between gap-3">
              <span
                className={`font-display text-lg font-medium tracking-tight ${
                  active ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface"
                }`}
              >
                {opt}
              </span>
              {active && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-400 text-white">
                  <IconCheck className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

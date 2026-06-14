"use client";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  IconBrain,
  IconCheck,
  IconWarn,
  IconKey,
  IconDatabase,
  IconGlobe,
  IconCreditCard,
  IconChat,
  IconMap,
  IconLayers,
  IconSparkles,
  IconRocket,
} from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });

interface DiagItem {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
  source: string | null;
  recommend: string | null;
}
interface PropositoData {
  project: { id: string; name: string; domain: string | null; vercel_url: string | null };
  proposito: {
    summary: string | null;
    audience: string | null;
    problem: string | null;
    revenue_model: string | null;
    business_model: string | null;
    north_star: string | null;
    value_prop: string | null;
  } | null;
  understanding_completeness: number;
  readiness: number;
  required_total: number;
  present_total: number;
  items: DiagItem[];
  missing: DiagItem[];
  needs_input: boolean;
}

const CAP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  auth: IconKey,
  database: IconDatabase,
  hosting: IconRocket,
  domain: IconGlobe,
  payments: IconCreditCard,
  email: IconChat,
  sms_whatsapp: IconChat,
  tickets: IconLayers,
  maps: IconMap,
  storage: IconLayers,
  ai: IconSparkles,
};

function ReadinessRing({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const tone =
    value >= 100 ? "#00E5A0" : value >= 60 ? "#7C3AED" : value >= 30 ? "#F5A623" : "#ef4444";
  return (
    <div className="relative h-[78px] w-[78px] shrink-0">
      <svg viewBox="0 0 78 78" className="h-full w-full -rotate-90">
        <circle cx="39" cy="39" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <motion.circle
          cx="39" cy="39" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ ease: EASE, duration: 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">{value}%</span>
        <span className="text-[8px] uppercase tracking-wide text-white/35">funcional</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-white/80">{value}</p>
    </div>
  );
}

export function PropositoPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useSWR<PropositoData>(
    `/api/my-project/${projectId}/proposito`,
    fetcher,
    { refreshInterval: 30000 },
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#0f0b1f] via-[#0a0a14] to-[#080610] p-5"
    >
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-600/20 blur-[70px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
            <IconBrain className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white">
              Propósito
            </p>
            <p className="text-[10px] text-white/35">El porqué del negocio · estado real</p>
          </div>
        </div>
        {data && <ReadinessRing value={data.readiness} />}
      </div>

      {isLoading && (
        <p className="relative mt-4 text-[12px] text-white/40">Cargando propósito…</p>
      )}

      {data && (
        <div className="relative mt-4 space-y-4">
          {data.needs_input ? (
            <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-3.5 py-3">
              <p className="text-[12px] text-white/55">
                Entendimiento de negocio <span className="text-white/35">por capturar</span>.
                Aquí vivirá qué es, a quién sirve, qué problema resuelve y cómo gana dinero.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3 sm:grid-cols-2">
              <Field label="Qué es" value={data.proposito?.summary ?? null} />
              <Field label="A quién sirve" value={data.proposito?.audience ?? null} />
              <Field label="Problema que resuelve" value={data.proposito?.problem ?? null} />
              <Field label="Cómo gana dinero" value={data.proposito?.revenue_model ?? null} />
              <Field label="Modelo" value={data.proposito?.business_model ?? null} />
              <Field label="Norte / objetivo" value={data.proposito?.north_star ?? null} />
              <div className="sm:col-span-2">
                <Field label="Propuesta de valor" value={data.proposito?.value_prop ?? null} />
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                Para quedar al 100% funcional
              </p>
              <span className="text-[10px] text-white/35">
                {data.present_total}/{data.required_total} listas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {data.items
                .filter((i) => i.required || i.present)
                .map((i) => {
                  const Ico = CAP_ICON[i.key] ?? IconLayers;
                  return (
                    <div
                      key={i.key}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                        i.present
                          ? "border-emerald-400/15 bg-emerald-400/[0.06]"
                          : "border-amber-400/20 bg-amber-400/[0.06]"
                      }`}
                    >
                      <Ico className={`h-3.5 w-3.5 ${i.present ? "text-emerald-300" : "text-amber-300"}`} />
                      <span className="flex-1 truncate text-[11px] text-white/75">{i.label}</span>
                      {i.present ? (
                        <IconCheck className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <IconWarn className="h-3 w-3 text-amber-300" />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {data.missing.length > 0 ? (
            <div className="space-y-1.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-3.5 py-3">
              <p className="text-[11px] font-semibold text-amber-200">
                Falta para dejarla al cien:
              </p>
              {data.missing.map((m) => (
                <div key={m.key} className="flex gap-2 text-[12px] text-white/70">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-300" />
                  <span>
                    <span className="font-medium text-white/85">{m.label}.</span>{" "}
                    {m.recommend}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] px-3.5 py-2.5">
              <IconCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-[12px] text-emerald-100">
                Integraciones base completas. La app está al 100% funcional.
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

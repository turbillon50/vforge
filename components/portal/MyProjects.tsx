"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconLoader,
  IconChevR,
  IconBoxes,
  IconGlobe,
  IconPlus,
  IconSparkles,
  IconX,
} from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) => fetch(u).then((r) => r.json());

/**
 * Saludo de V al aterrizar desde el onboarding (/workspace?welcome=1&name=…&svc=…).
 * Se lee de la URL en el cliente (sin useSearchParams → sin Suspense boundary)
 * y se limpia el query string para que no reaparezca al recargar.
 */
function useWelcome() {
  const [welcome, setWelcome] = useState<{ name: string; svc: number } | null>(
    null,
  );
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("welcome") !== "1") return;
    setWelcome({ name: p.get("name") ?? "", svc: Number(p.get("svc") ?? 0) });
    window.history.replaceState(null, "", "/workspace");
  }, []);
  return [welcome, () => setWelcome(null)] as const;
}

interface MyProject {
  project_id: string;
  member_role: string;
  name: string;
  status: string;
  domain: string | null;
  vercel_url: string | null;
}

export function MyProjects() {
  const { data, isLoading } = useSWR<{ projects: MyProject[] }>(
    "/api/my-project",
    fetcher,
    { refreshInterval: 30000 },
  );
  const projects = data?.projects ?? [];
  const [welcome, dismissWelcome] = useWelcome();

  return (
    <div className="min-h-screen bg-[#03020a] pb-24">
      <div className="sticky top-0 z-10 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Mis proyectos</p>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Tu espacio de cliente en V·Forge
            </p>
          </div>
          <a
            href="/workspace/setup"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-3.5 py-2 text-[12px] font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition hover:brightness-110"
          >
            <IconPlus size={14} /> Nuevo proyecto
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-3 px-5 pt-6">
        <AnimatePresence>
          {welcome && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/12 to-violet-500/[0.04] p-4 pr-9"
            >
              <button
                onClick={dismissWelcome}
                aria-label="Cerrar"
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-[var(--fg-muted)] transition hover:text-white"
              >
                <IconX size={14} />
              </button>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30">
                  <IconSparkles size={16} className="text-violet-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white">
                    Bienvenido{welcome.name ? ` ${welcome.name}` : ""}. Tu workspace está listo.
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
                    Conectaste {welcome.svc} {welcome.svc === 1 ? "servicio" : "servicios"}. ¿Empezamos con tu primer proyecto?
                  </p>
                  <a
                    href="/workspace/setup"
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.1]"
                  >
                    <IconPlus size={12} /> Crear mi primer proyecto
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--fg-muted)]">
            <IconLoader size={18} className="animate-spin" /> Cargando…
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-1)] bg-[var(--surface-1)] px-6 py-14 text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/25">
              <IconBoxes size={22} className="text-violet-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--fg-secondary)]">
              Aún no tienes proyectos
            </p>
            <p className="mx-auto mt-1 max-w-[16rem] text-[12px] text-[var(--fg-muted)]">
              Crea tu primer proyecto y V te acompaña a construirlo paso a paso.
            </p>
            <a
              href="/workspace/setup"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition hover:brightness-110"
            >
              <IconPlus size={14} /> Nuevo proyecto
            </a>
          </div>
        )}

        {projects.map((p, i) => (
          <motion.a
            key={p.project_id}
            href={`/workspace/proyecto/${p.project_id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3), ease: EASE }}
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-4 transition hover:border-[var(--border-1)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/8">
              <IconBoxes size={18} className="text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[var(--fg-primary)]">
                {p.name}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-[var(--fg-tertiary)]">
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] capitalize text-[var(--fg-tertiary)]">
                  {p.status}
                </span>
                {p.domain && (
                  <span className="flex items-center gap-1 truncate">
                    <IconGlobe size={10} /> {p.domain}
                  </span>
                )}
              </p>
            </div>
            <IconChevR
              size={16}
              className="text-[var(--fg-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-tertiary)]"
            />
          </motion.a>
        ))}
      </div>
    </div>
  );
}

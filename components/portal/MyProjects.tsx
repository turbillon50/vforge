"use client";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  IconLoader,
  IconChevR,
  IconBoxes,
  IconGlobe,
} from "@/components/brand/VFIcons";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fetcher = (u: string) => fetch(u).then((r) => r.json());

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

  return (
    <div className="min-h-screen bg-[#03020a] pb-24">
      <div className="sticky top-0 z-10 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
        <div className="mx-auto max-w-xl px-5 py-4">
          <p className="text-sm font-semibold text-white">Mis proyectos</p>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Tu espacio de cliente en V·Forge
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-3 px-5 pt-6">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--fg-muted)]">
            <IconLoader size={18} className="animate-spin" /> Cargando…
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-1)] bg-[var(--surface-1)] py-14 text-center">
            <IconBoxes size={24} className="mx-auto mb-2 text-[var(--fg-muted)]" />
            <p className="text-sm text-[var(--fg-tertiary)]">Aún no tienes proyectos.</p>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              Cuando aceptes una invitación, aparecerá aquí.
            </p>
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

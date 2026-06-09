"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconActivity, IconExtLink, IconBoxes, IconBranch, IconKey, IconMap, IconChats, IconUsers, IconWorkflow } from "@/components/brand/VFIcons";
import { VPresence } from "@/components/brand/VPresence";
import { CardSkeleton } from "@/components/ui/Skeleton";

type Project = {
  id: string;
  name: string;
  github_repo?: string | null;
  vercel_url?: string | null;
  status?: string | null;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

const SHORTCUTS = [
  { href: "/app/projects", label: "Proyectos", desc: "Tu portafolio en vivo", Icon: IconWorkflow },
  { href: "/app/deployments", label: "Deploys", desc: "Qué está en producción", Icon: IconActivity },
  { href: "/app/repovision", label: "RepoVision", desc: "Tus repos en 3D", Icon: IconBranch },
  { href: "/app/blueprint", label: "Blueprint", desc: "El flujo de la fábrica", Icon: IconMap },
  { href: "/app/integrations", label: "Conexiones", desc: "Servicios conectados", Icon: IconBoxes },
  { href: "/app/secrets", label: "Bóveda", desc: "Llaves y credenciales", Icon: IconKey },
  { href: "/app/admin", label: "Usuarios", desc: "Quién está en VForge", Icon: IconUsers },
];

export function HomeExperience({ name }: { name: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: Project[] }) => setProjects(d.projects ?? []))
      .catch(() => undefined)
      .finally(() => setLoadingProjects(false));
  }, []);

  return (
    <main className="home-aurora grain mx-auto w-full max-w-5xl px-5 pb-28 pt-10 md:px-8 md:pt-16">
      {/* Saludo — tipografía gigante, limpia, sin cajas */}
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-base text-on-surface-variant md:text-lg">
          {greeting()}, {name}.
        </p>
        <h1 className="mt-1 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] text-on-surface md:text-7xl">
          Tu fábrica está
          <br />
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            despierta.
          </span>
        </h1>
      </motion.header>

      {/* V — el centro de la casa */}
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 md:mt-14"
      >
        <Link href="/app/chat"
          data-vorb-avoid
          className="surface-deep group relative block overflow-hidden rounded-3xl border border-app bg-gradient-to-b from-violet-500/[0.07] via-surface/60 to-surface/80 px-6 py-10 backdrop-blur-xl transition duration-300 hover:border-violet-400/30 hover:shadow-glow-violet active:scale-[0.99] md:px-12 md:py-14"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/25 blur-[110px] transition group-hover:bg-violet-500/35"
          />
          <div className="relative flex flex-col items-center text-center">
            <VPresence size={104} />
            <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">
              Habla con V
            </h2>
            <p className="mt-2 max-w-md text-balance text-sm leading-relaxed text-on-surface-variant md:text-base">
              Tu copiloto conoce tus repos, tus deploys y tu memoria.
              Pídele lo que necesites — ella se encarga.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-2.5 text-sm font-medium text-white shadow-glow-violet transition group-hover:scale-[1.03]">
              Abrir conversación <IconExtLink size={15} />
            </span>
          </div>
        </Link>
      </motion.section>

      {/* Accesos — fila deslizable estilo Apple TV */}
      <section className="mt-12 md:mt-16">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-on-surface md:text-2xl">
          Explora
        </h3>
        <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8">
          {SHORTCUTS.map((s, i) => (
            <motion.div
              key={s.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="snap-start"
            >
              <Link href={s.href}
                className="surface-deep card-lift group flex h-32 w-44 shrink-0 flex-col justify-between rounded-2xl border border-app bg-surface/60 p-4 backdrop-blur-md transition active:scale-[0.97] md:h-36 md:w-52"
              >
                <s.Icon size={20} className="text-violet-300 transition group-hover:text-cyan-300" />
                <div>
                  <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Proyectos: skeleton mientras carga — nunca pantalla en blanco */}
      {loadingProjects && (
        <section className="mt-10 md:mt-14">
          <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-on-surface md:text-2xl">
            Tus proyectos
          </h3>
          <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-hidden px-5 pb-2 md:-mx-8 md:px-8">
            {[0, 1, 2, 3].map((i) => (
              <CardSkeleton key={i} className="h-28 w-56" />
            ))}
          </div>
        </section>
      )}

      {/* Proyectos — fila deslizable */}
      {!loadingProjects && projects.length > 0 && (
        <section className="mt-10 md:mt-14">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-on-surface md:text-2xl">
              Tus proyectos
            </h3>
            <Link href="/app/projects" className="text-[13px] text-violet-300 hover:text-violet-200">
              Ver todos
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8">
            {projects.slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/app/projects`}
                className="surface-deep card-lift group flex h-28 w-56 shrink-0 snap-start flex-col justify-between rounded-2xl border border-app bg-surface/60 p-4 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <p className="truncate font-display text-[15px] font-semibold tracking-tight text-on-surface">
                    {p.name}
                  </p>
                  <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success-emerald" />
                </div>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  {p.github_repo ?? p.vercel_url ?? "proyecto"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}

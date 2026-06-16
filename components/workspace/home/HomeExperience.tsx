"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { IconActivity, IconBoxes, IconBranch, IconKey, IconMap, IconUsers, IconWorkflow } from "@/components/brand/VFIcons";
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
    <main className="grain relative mx-auto w-full max-w-5xl overflow-hidden px-5 pb-28 pt-10 md:px-8 md:pt-16" style={{ background: "var(--void, #03020a)" }}>
      {/* Fondos de profundidad — gradientes difusos */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          style={{
            position: "absolute",
            top: "-12%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(88,28,235,0.16) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            right: "-12%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* HERO — centrado, jerarquía fuerte */}
      <div className="relative z-10 mx-auto flex max-w-[640px] flex-col items-center text-center">
        {/* Saludo */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm text-on-surface-variant md:text-base"
        >
          {greeting()}, {name}.
        </motion.p>

        {/* H1 dramático */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display"
          style={{
            marginTop: 10,
            fontSize: "clamp(3rem, 8vw, 5.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: "#f0f4ff",
          }}
        >
          Tu fábrica está
          <span
            style={{
              display: "block",
              background: "linear-gradient(135deg,#a78bfa,#22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            despierta.
          </span>
        </motion.h1>

        {/* Esfera V — protagonista absoluta */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "relative", marginTop: 56 }}
        >
          {/* Glow principal violeta — pulsa */}
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -110,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />
          {/* Glow secundario cyan, offset abajo-derecha */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -40,
              transform: "translate(60px, 60px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,211,238,0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <span className="block md:hidden">
              <VPresence size={180} />
            </span>
            <span className="hidden md:block">
              <VPresence size={220} />
            </span>
          </div>
        </motion.div>

        {/* Botón — flotando bajo la esfera */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ marginTop: 40 }}
        >
          <Link href="/app/chat" data-vorb-avoid>
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 32px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#7c3aed,#22d3ee)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 0 40px rgba(139,92,246,0.4)",
              }}
            >
              Hablar con V
            </motion.span>
          </Link>
        </motion.div>
      </div>

      {/* Accesos — fila deslizable estilo Apple TV */}
      <section className="relative z-10 mt-16 md:mt-20">
        <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-on-surface md:text-2xl">
          La fábrica
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
                className="surface-deep card-lift group flex h-32 w-44 shrink-0 flex-col justify-between rounded-2xl border border-app bg-[var(--color-surface-low)] p-4 backdrop-blur-md transition active:scale-[0.97] md:h-36 md:w-52"
              >
                <s.Icon size={20} className="text-violet-500 transition group-hover:text-cyan-600" />
                <div>
                  <p className="font-display text-[15px] font-semibold tracking-tight text-on-surface">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--fg-secondary)]">{s.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Proyectos: skeleton mientras carga — nunca pantalla en blanco */}
      {loadingProjects && (
        <section className="relative z-10 mt-10 md:mt-14">
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
        <section className="relative z-10 mt-10 md:mt-14">
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
                className="surface-deep card-lift group flex h-28 w-56 shrink-0 snap-start flex-col justify-between rounded-2xl border border-app bg-[var(--color-surface-low)] p-4 backdrop-blur-md"
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

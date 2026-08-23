"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconArrowR,
  IconGlobe,
  IconLayout,
  IconShield,
} from "@/components/brand/VFIcons";
import { monochromeClerkAppearance } from "@/components/auth/ClerkShell";
import type { ScopedProject } from "@/lib/projects/scoped-catalog";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Observador",
  reviewer: "Revisor",
  observer: "Observador",
};

export function ScopedWorkspaceHome({
  name,
  email,
  projects,
}: {
  name: string;
  email: string;
  projects: ScopedProject[];
}) {
  return (
    <main className="min-h-svh bg-[var(--color-background)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--border-1)] bg-[var(--color-surface)]">
        <div className="mx-auto flex min-h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/workspace" aria-label="VForge, proyectos compartidos">
            <VWordmark />
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-[var(--color-surface)] py-1 pl-1 pr-3">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                ...monochromeClerkAppearance,
                elements: {
                  ...monochromeClerkAppearance.elements,
                  avatarBox: "h-7 w-7",
                },
              }}
            />
            <span className="hidden max-w-[150px] truncate text-[11px] font-medium sm:block">
              {name || email}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-16">
        <p className="mono-label">Acceso por membresía</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.8rem,8vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
          Tus proyectos autorizados.
        </h1>
        <p className="mt-6 max-w-2xl break-words text-[15px] leading-7 text-[var(--fg-secondary)] sm:text-[17px]">
          Aquí sólo aparecen las salas compartidas con {email}. Otros proyectos,
          repositorios, secretos y administración permanecen fuera de alcance.
        </p>

        {projects.length === 0 ? (
          <section className="mt-10 border border-[var(--color-ink)] bg-[var(--color-surface)] p-6 sm:mt-14 sm:p-9">
            <IconShield size={22} />
            <h2 className="mt-5 text-[26px] font-medium tracking-[-0.045em]">
              Todavía no tienes una sala compartida.
            </h2>
            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[var(--fg-secondary)]">
              La invitación debe enviarse y aceptarse con este mismo correo. En
              cuanto exista una membresía activa, el proyecto aparecerá aquí.
            </p>
          </section>
        ) : (
          <section className="mt-10 grid gap-3 sm:mt-14 md:grid-cols-2">
            {projects.map((project) => {
              const href =
                project.access_kind === "live"
                  ? `/app/live/${encodeURIComponent(project.id)}`
                  : `/workspace/proyecto/${encodeURIComponent(project.id)}`;
              const destination = project.domain || project.vercel_url;
              return (
                <Link
                  key={project.id}
                  href={href}
                  className="group flex min-h-[210px] flex-col border border-[var(--border-1)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-ink)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--fg-muted)]">
                      <span className="status-shape" data-active="true" />
                      {ROLE_LABEL[project.member_role] ?? project.member_role}
                    </span>
                    <IconLayout size={15} />
                  </div>
                  <h2 className="mt-8 text-[28px] font-medium tracking-[-0.05em]">
                    {project.name}
                  </h2>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[var(--fg-muted)]">
                    {project.status}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                    <span className="flex min-w-0 items-center gap-2 text-[10px] text-[var(--fg-secondary)]">
                      <IconGlobe size={11} className="shrink-0" />
                      <span className="truncate">{destination || "Sala privada"}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-2 text-[11px] font-medium">
                      Abrir <IconArrowR size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

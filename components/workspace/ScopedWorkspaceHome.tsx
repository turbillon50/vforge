"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconArrowR,
  IconCheck,
  IconGithub,
  IconGlobe,
  IconLayout,
  IconRocket,
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
  connections,
}: {
  name: string;
  email: string;
  projects: ScopedProject[];
  connections: string[];
}) {
  const githubConnected = connections.includes("github");
  const vercelConnected = connections.includes("vercel");
  const connectionItems = [
    {
      id: "github",
      title: "GitHub",
      body: "Tu código, repositorios y cambios.",
      connected: githubConnected,
      href: "/api/auth/github/start?return_to=%2Fworkspace",
      icon: IconGithub,
    },
    {
      id: "vercel",
      title: "Vercel",
      body: "Tus deployments, previews y dominios.",
      connected: vercelConnected,
      href: "/api/auth/vercel/start?return_to=%2Fworkspace",
      icon: IconRocket,
    },
  ];

  return (
    <main className="min-h-svh bg-[var(--color-background)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--border-1)] bg-[var(--color-surface)]">
        <div className="mx-auto flex min-h-[64px] max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/workspace" aria-label="VForge, tu espacio de trabajo">
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
        <p className="mono-label">Tu workspace</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.8rem,8vw,6.8rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
          Tu espacio ya está listo.
        </h1>
        <p className="mt-6 max-w-2xl break-words text-[15px] leading-7 text-[var(--fg-secondary)] sm:text-[17px]">
          Esta cuenta pertenece a {email}. No necesitas una invitación: conecta
          tus propias herramientas y VForge mantendrá tus accesos separados de
          los de cualquier otra persona.
        </p>

        <section className="mt-10 sm:mt-14" aria-labelledby="connections-title">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--color-ink)] pb-4">
            <div>
              <p className="mono-label">Paso 01</p>
              <h2
                id="connections-title"
                className="mt-2 text-[28px] font-medium tracking-[-0.05em]"
              >
                Tus conexiones
              </h2>
            </div>
            <p className="hidden max-w-sm text-right text-[12px] leading-5 text-[var(--fg-secondary)] sm:block">
              Si todavía no tienes cuenta, puedes crearla al continuar con cada
              proveedor.
            </p>
          </div>
          <div className="grid md:grid-cols-2">
            {connectionItems.map(
              ({ id, title, body, connected, href, icon: Icon }) => (
                <article
                  key={id}
                  className="flex min-h-[170px] flex-col border-b border-x border-[var(--border-1)] bg-[var(--color-surface)] p-5 sm:p-6 md:first:border-r-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-10 w-10 place-items-center border border-[var(--color-ink)]">
                      <Icon size={17} />
                    </div>
                    <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em]">
                      {connected ? (
                        <IconCheck size={12} />
                      ) : (
                        <span className="status-shape" />
                      )}
                      {connected ? "Conectado" : "Sin conectar"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[21px] font-medium tracking-[-0.04em]">
                    {title}
                  </h3>
                  <div className="mt-auto flex items-end justify-between gap-4 pt-3">
                    <p className="text-[12px] leading-5 text-[var(--fg-secondary)]">
                      {body}
                    </p>
                    {connected ? (
                      <span className="text-[11px] font-medium">Listo</span>
                    ) : (
                      <a href={href} className="btn-ghost !min-h-9 !px-3">
                        Conectar <IconArrowR size={12} />
                      </a>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        <section className="mt-12 sm:mt-16" aria-labelledby="projects-title">
          <p className="mono-label">Paso 02</p>
          <h2
            id="projects-title"
            className="mt-2 text-[28px] font-medium tracking-[-0.05em]"
          >
            Tus proyectos
          </h2>
          {projects.length === 0 ? (
            <div className="mt-5 border border-[var(--color-ink)] bg-[var(--color-surface)] p-6 sm:p-9">
              <IconShield size={22} />
              <h3 className="mt-5 text-[26px] font-medium tracking-[-0.045em]">
                Aún no hay proyectos en este espacio.
              </h3>
              <p className="mt-3 max-w-xl text-[13px] leading-6 text-[var(--fg-secondary)]">
                Puedes empezar desde cero con tus propias conexiones. Si alguien
                comparte una sala con {email}, también aparecerá aquí sin mezclar
                cuentas, repositorios ni secretos.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
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
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

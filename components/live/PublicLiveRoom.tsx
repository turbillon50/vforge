"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";

type Project = {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  vercel_url: string | null;
  domain: string | null;
};

type Viewport = "desktop" | "mobile" | "admin";

export function PublicLiveRoom({ project }: { project: Project }) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [showInstall, setShowInstall] = useState(false);

  const urls = useMemo(() => {
    const fallback = project.domain
      ? project.domain.startsWith("http")
        ? project.domain
        : `https://${project.domain}`
      : project.vercel_url;
    return {
      desktop: project.desktop_url || fallback,
      mobile: project.mobile_url || fallback,
      admin: project.admin_url || fallback,
    };
  }, [project]);

  const activeUrl = urls[viewport];

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f7f5] text-black">
      <header className="flex h-[56px] items-center justify-between border-b border-[var(--border-1)] bg-white px-4 md:px-6">
        <VWordmark />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Sala de revisión
        </span>
      </header>

      {/* CTA registro + instalar */}
      <div className="border-b border-[var(--border-1)] bg-white px-4 py-4 md:px-6">
        <p className="text-[14px] font-medium tracking-[-0.02em]">{project.name}</p>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--fg-secondary)]">
          Este link es permanente: es tu proyecto. Puedes guardarlo y volver cuando
          quieras. Te invitamos a crear cuenta gratis para tenerlo en tu perfil e
          instalarlo en el teléfono.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn-primary !min-h-9 !px-4 text-[12px]">
            Crear cuenta gratis
          </Link>
          <button
            type="button"
            onClick={() => setShowInstall((v) => !v)}
            className="btn-ghost !min-h-9 !px-4 text-[12px]"
          >
            Cómo instalar en el teléfono
          </button>
          {activeUrl ? (
            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !min-h-9 !px-4 text-[12px]"
            >
              Abrir app en nueva pestaña
            </a>
          ) : null}
        </div>

        {showInstall ? (
          <div className="mt-4 max-w-xl border border-[var(--border-1)] bg-[#f7f7f5] px-4 py-3 text-[12px] leading-5 text-[var(--fg-secondary)]">
            <p className="font-medium text-black">iPhone (Safari)</p>
            <p className="mt-1">
              1) Abre este link en Safari · 2) Toca el botón Compartir · 3) “Añadir
              a pantalla de inicio” · 4) Confirma. Queda como app.
            </p>
            <p className="mt-3 font-medium text-black">Android (Chrome)</p>
            <p className="mt-1">
              1) Abre este link en Chrome · 2) Menú ⋮ · 3) “Instalar app” o “Añadir
              a pantalla de inicio”. Listo.
            </p>
            <p className="mt-3 text-[11px] text-[var(--fg-muted)]">
              También puedes guardar el link en WhatsApp o Notas. No caduca.
            </p>
          </div>
        ) : null}
      </div>

      {/* Viewports */}
      <div className="flex gap-1 border-b border-[var(--border-1)] bg-white px-4 py-2 md:px-6">
        {(
          [
            ["desktop", "Escritorio"],
            ["mobile", "Móvil"],
            ["admin", "Admin"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setViewport(id)}
            className={
              viewport === id
                ? "rounded-md border border-black bg-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white"
                : "rounded-md border border-transparent px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)]"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-start p-4 md:p-6">
        {!activeUrl ? (
          <p className="mt-20 text-[13px] text-[var(--fg-muted)]">
            Este proyecto aún no tiene URL de preview configurada.
          </p>
        ) : viewport === "mobile" ? (
          <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[24px] border-2 border-black bg-white shadow-lg">
            <div className="flex h-8 items-center justify-center border-b border-[var(--border-1)]">
              <span className="h-1.5 w-16 rounded-full bg-black/20" />
            </div>
            <iframe
              title={`${project.name} móvil`}
              src={activeUrl}
              className="h-[640px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="w-full max-w-[1200px] overflow-hidden rounded-md border border-black bg-white shadow-sm">
            <iframe
              title={`${project.name} ${viewport}`}
              src={activeUrl}
              className="h-[min(75vh,800px)] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border-1)] bg-white px-4 py-3 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        VForge · Solo este proyecto · Sin secretos ni código
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMenu, IconUsers, IconX } from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { MobileLiveShell } from "@/components/live/MobileLiveShell";
import { InvitePanel } from "@/components/live/InvitePanel";

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Owner",
  reviewer: "Revisor",
  observer: "Observador",
};

export function LivePortalMobileEntry({
  project,
  me,
}: {
  project: {
    id: string;
    name: string;
    status: string;
    desktop_url: string | null;
    mobile_url: string | null;
    admin_url: string | null;
  };
  me: {
    name: string;
    role: LiveRole;
    isPlatformOwner: boolean;
  };
}) {
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const canInvite = me.role === "owner";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-svh flex-col overflow-hidden overscroll-none bg-white text-black">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--border-1)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--border-1)]"
            aria-label="Menú"
          >
            <IconMenu size={16} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium tracking-[-0.02em]">
              {project.name}
            </p>
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Live · {ROLE_LABEL[me.role]}
            </p>
          </div>
        </div>
        {canInvite ? (
          <a
            href="#invite"
            onClick={() => setMenuOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-black bg-black text-white"
            aria-label="Invitar"
          >
            <IconUsers size={14} />
          </a>
        ) : null}
      </header>

      <div className="min-h-0 flex-1">
        <MobileLiveShell project={project} canSeeAdmin={canSeeAdmin} />
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-between border-b border-[var(--border-1)] px-4 py-3">
              <p className="text-[14px] font-medium">Sala · {project.name}</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)]"
              >
                <IconX size={14} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <Link
                href={me.isPlatformOwner ? "/app/projects" : "/workspace"}
                className="block rounded-xl border border-[var(--border-1)] px-4 py-3 text-[14px]"
              >
                Volver a proyectos
              </Link>
              {canInvite ? (
                <div id="invite">
                  <InvitePanel projectId={project.id} projectName={project.name} compact />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Detecta viewport móvil en cliente. */
export function useIsPhone(breakpoint = 768) {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isPhone;
}

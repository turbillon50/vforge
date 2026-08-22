"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconHome,
  IconLayers,
  IconMenu,
  IconSettings,
  IconUsers,
  IconX,
  IconZap,
} from "@/components/brand/VFIcons";
import { monochromeClerkAppearance } from "@/components/auth/ClerkShell";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

type IconComponent = (props: {
  size?: number;
  className?: string;
}) => React.ReactElement | null;

type NavItem = {
  href: string;
  label: string;
  description: string;
  Icon: IconComponent;
};

const PRIMARY_NAV: NavItem[] = [
  {
    href: "/app/projects",
    label: "Proyectos",
    description: "Salas y viewports",
    Icon: IconLayers,
  },
  {
    href: "/app/activity",
    label: "Actividad",
    description: "Eventos del sistema",
    Icon: IconActivity,
  },
  {
    href: "/app/integrations",
    label: "Conexiones",
    description: "GitHub, Vercel y servicios",
    Icon: IconZap,
  },
  {
    href: "/app/admin",
    label: "Administración",
    description: "Usuarios y permisos",
    Icon: IconUsers,
  },
];

const TITLES: Record<string, string> = {
  "/app/projects": "Proyectos",
  "/app/activity": "Actividad",
  "/app/integrations": "Conexiones",
  "/app/admin": "Administración",
  "/app/settings": "Configuración",
};

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <Link href="/app/projects" onClick={onNavigate} aria-label="VForge, proyectos">
          <VWordmark />
        </Link>
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.17em] text-[var(--fg-muted)]">
          Project control room
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <p className="mb-3 px-2 font-mono text-[8px] uppercase tracking-[0.17em] text-[var(--fg-muted)]">
          Workspace
        </p>
        <div className="space-y-1">
          {PRIMARY_NAV.map(({ href, label, description, Icon }) => {
            const active = routeIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-md border px-3 py-3 transition",
                  active
                    ? "border-black bg-black text-white"
                    : "border-transparent text-black hover:border-[var(--border-1)] hover:bg-[#f7f7f5]",
                )}
              >
                <Icon
                  size={15}
                  className={cn("mt-0.5 shrink-0", active ? "text-white" : "text-black")}
                />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium">{label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[9px]",
                      active ? "text-white/55" : "text-[var(--fg-muted)]",
                    )}
                  >
                    {description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--border-1)] p-3">
        <Link
          href="/app/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] text-[var(--fg-secondary)] hover:bg-[#f2f2f0] hover:text-black"
        >
          <IconSettings size={14} /> Configuración
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[11px] text-[var(--fg-secondary)] hover:bg-[#f2f2f0] hover:text-black"
        >
          <IconHome size={14} /> Volver al sitio
        </Link>
      </div>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  if (pathname.startsWith("/app/live/")) {
    return <>{children}</>;
  }

  const title =
    Object.entries(TITLES).find(([path]) => routeIsActive(pathname, path))?.[1] ??
    "VForge";

  return (
    <div className="min-h-dvh bg-[#f7f7f5] text-black">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] border-r border-[var(--border-1)] md:block">
        <Sidebar pathname={pathname} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar navegación"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-black bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] bg-white"
              aria-label="Cerrar menú"
            >
              <IconX size={14} />
            </button>
            <Sidebar pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="min-h-dvh md:pl-[220px]">
        <header className="sticky top-0 z-20 border-b border-[var(--border-1)] bg-white/95 backdrop-blur-md">
          <div className="flex h-[58px] items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] md:hidden"
                aria-label="Abrir menú"
              >
                <IconMenu size={16} />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                  VForge
                </p>
                <h1 className="truncate text-[15px] font-medium tracking-[-0.025em]">
                  {title}
                </h1>
              </div>
            </div>
            <AccountMenu />
          </div>
        </header>

        <main className="min-h-[calc(100dvh-58px)]">{children}</main>
      </div>
    </div>
  );
}

function AccountMenu() {
  const clerkEnabled = hasClerkPublishableKey();

  if (!clerkEnabled) {
    return (
      <span className="rounded-full border border-[var(--border-1)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em]">
        Sesión local
      </span>
    );
  }

  return <ClerkAccount />;
}

function ClerkAccount() {
  const { user } = useUser();
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border-1)] bg-white py-1 pl-1 pr-3">
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
      <span className="hidden max-w-[110px] truncate text-[11px] font-medium sm:block">
        {user?.firstName ?? user?.username ?? "Cuenta"}
      </span>
    </div>
  );
}

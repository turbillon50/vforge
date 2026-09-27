"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconChat,
  IconCpu,
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
import { ConnectionGate } from "@/components/workspace/ConnectionGate";

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
    href: "/app/chat",
    label: "Construir",
    description: "Chat, herramientas y preview",
    Icon: IconChat,
  },
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
    href: "/app/tablero",
    label: "Tablero",
    description: "Agentes y avance en vivo",
    Icon: IconCpu,
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
  "/app/chat": "Estudio",
  "/app/home": "Estudio",
  "/app/projects": "Proyectos",
  "/app/activity": "Actividad",
  "/app/tablero": "Tablero",
  "/app/integrations": "Conexiones",
  "/app/admin": "Administración",
  "/app/settings": "Configuración",
  "/app/setup": "Setup",
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
    <div className="flex h-full flex-col bg-[#121214] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/app/chat" onClick={onNavigate} aria-label="VForge, estudio">
          <VWordmark inverse />
        </Link>
        <p className="mt-2 font-mono text-label-caps uppercase text-[var(--fg-muted)]">
          Build control room
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <p className="mb-3 px-2 font-mono text-label-caps uppercase text-[var(--fg-muted)]">
          Workspace
        </p>
        <div className="space-y-1">
          {PRIMARY_NAV.map(({ href, label, Icon }) => {
            const active = routeIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-md border px-3 py-3 transition duration-200 ease-out",
                  active
                    ? "border-white bg-white text-black"
                    : "border-transparent text-white/80 hover:border-white/10 hover:bg-white/5",
                )}
              >
                <Icon
                  size={15}
                  className={cn("mt-0.5 shrink-0", active ? "text-black" : "text-white/80")}
                />
                <span className="min-w-0">
                  <span className="text-[14px] font-medium leading-5">{label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/app/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] text-white/70 transition duration-200 ease-out hover:bg-white/5 hover:text-white"
        >
          <IconSettings size={14} /> Configuración
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] text-white/70 transition duration-200 ease-out hover:bg-white/5 hover:text-white"
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
  const isStudio = pathname === "/app/chat";
  const isSetup = pathname.startsWith("/app/setup");
  const isLive = pathname.startsWith("/app/live/");

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

  // Live y Setup: pantalla completa, sin chrome del shell
  if (isLive || isSetup) {
    return <ConnectionGate>{children}</ConnectionGate>;
  }

  const title =
    Object.entries(TITLES).find(([path]) => routeIsActive(pathname, path))?.[1] ??
    "VForge";

  return (
    <ConnectionGate>
      <div
        className={cn(
          "h-svh overflow-hidden bg-[#0c0c0e] text-[var(--color-ink)]",
        )}
      >
        <aside className="fixed bottom-9 left-0 top-14 z-30 hidden w-[248px] border-r border-white/10 md:block">
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

        <div
          className={cn(
            "h-svh overflow-hidden pt-14 pb-9 md:pl-[248px]",
          )}
        >
          <header
            className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#090909] text-white"
          >
            <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-md border border-white/20 text-white md:hidden"
                  aria-label="Abrir menú"
                >
                  <IconMenu size={16} />
                </button>
                <div className="min-w-0">
                  <p className="font-mono text-label-caps uppercase text-white/45">
                    VForge
                  </p>
                  <h1 className="truncate text-body-md font-medium tracking-[-0.02em] text-white">
                    {title}
                  </h1>
                </div>
              </div>
              <AccountMenu />
            </div>
          </header>

          <main
            className={cn(
              "h-full overflow-y-auto",
              isStudio && "overflow-hidden",
            )}
          >
            {children}
          </main>
          {isStudio ? null : (
            <footer className="fixed inset-x-0 bottom-0 z-40 flex h-9 items-center justify-between border-t border-white/10 bg-[#090909] px-4 text-white/70">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em]">VForge</p>
              <p className="text-[12px]">Control room</p>
            </footer>
          )}
        </div>
      </div>
    </ConnectionGate>
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
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-1)] bg-white py-1 pl-1 pr-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
      <span className="hidden whitespace-nowrap text-[14px] font-medium sm:block">
        {user?.fullName ?? user?.firstName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Cuenta"}
      </span>
    </div>
  );
}

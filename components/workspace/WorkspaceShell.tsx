"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconCpu,
  IconFactory,
  IconHammer,
  IconHome,
  IconLayers,
  IconMenu,
  IconSettings,
  IconUsers,
  IconPlug,
  IconTrio,
  IconX,
} from "@/components/brand/VFIcons";
import { monochromeClerkAppearance } from "@/components/auth/ClerkShell";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { ConnectionGate } from "@/components/workspace/ConnectionGate";
import { OwnerPushBanner } from "@/components/pwa/OwnerPushBanner";
import { LimiteDeError } from "@/components/system/LimiteDeError";

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
    Icon: IconHammer,
  },
  {
    href: "/app/trio",
    label: "Trío",
    description: "Claude, ChatGPT y V en paralelo",
    Icon: IconTrio,
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
    href: "/app/fabrica",
    label: "Fábrica",
    description: "La casa en vivo: alianza, V-Trading y Brain",
    Icon: IconFactory,
  },
  {
    href: "/app/integrations",
    label: "Conexiones",
    description: "GitHub, Vercel y servicios",
    Icon: IconPlug,
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
  "/app/trio": "Trío",
  "/app/projects": "Proyectos",
  "/app/activity": "Actividad",
  "/app/tablero": "Tablero",
  "/app/fabrica": "Fábrica",
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
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <Link href="/app/chat" onClick={onNavigate} aria-label="VForge, estudio">
          <VWordmark />
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
                    ? "border-black bg-black text-white"
                    : "border-transparent text-black hover:border-[var(--border-1)] hover:bg-[#f7f7f5]",
                )}
              >
                <Icon
                  size={15}
                  className={cn("mt-0.5 shrink-0", active ? "text-white" : "text-black")}
                />
                <span className="min-w-0">
                  <span className="text-[14px] font-medium leading-5">{label}</span>
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
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-[var(--fg-secondary)] transition duration-200 ease-out hover:bg-[#f2f2f0] hover:text-black"
        >
          <IconSettings size={14} /> Configuración
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm text-[var(--fg-secondary)] transition duration-200 ease-out hover:bg-[#f2f2f0] hover:text-black"
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
  const isFixedWorkspace =
    isStudio || pathname === "/app/trio" || pathname === "/forge" || pathname === "/v";
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
          "bg-[var(--color-background)] text-[var(--color-ink)]",
          isFixedWorkspace
            ? "h-svh overflow-hidden overscroll-none lg:h-dvh"
            : "min-h-svh",
        )}
      >
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-[var(--border-1)] md:block">
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
            "md:pl-[248px]",
            isFixedWorkspace ? "flex h-full flex-col overflow-hidden" : "min-h-svh",
          )}
        >
          <header
            className={cn(
              "z-20 border-b border-[var(--border-1)] bg-white/95 backdrop-blur-md",
              isFixedWorkspace ? "relative shrink-0" : "sticky top-0",
            )}
          >
            <div className="flex h-[58px] items-center justify-between gap-4 px-page-sm md:px-page-md xl:px-page-lg">
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
                  <p className="font-mono text-label-caps uppercase text-[var(--fg-muted)]">
                    VForge
                  </p>
                  <h1 className="truncate text-body-md font-medium tracking-[-0.02em]">
                    {title}
                  </h1>
                </div>
              </div>
              <AccountMenu />
            </div>
          </header>

          {/* El aviso de push vive AQUÍ, en el flujo, no flotando encima del
              contenido. Al ser una franja del shell, el Estudio se encoge solo
              (main es flex-1) y nunca queda nada tapado. */}
          <LimiteDeError nombre="OwnerPushBanner">
            <OwnerPushBanner />
          </LimiteDeError>

          <main
            className={cn(
              isFixedWorkspace
                ? "flex min-h-0 flex-1 overflow-hidden"
                : "min-h-[calc(100svh-58px-72px)]",
            )}
          >
            {children}
          </main>
          {isFixedWorkspace ? null : (
            <footer className="flex h-[72px] items-center justify-between border-t border-[var(--border-1)] bg-white px-page-sm md:px-page-md xl:px-page-lg">
              <p className="font-mono text-label-caps uppercase text-[var(--fg-muted)]">
                VForge
              </p>
              <p className="text-body-sm text-[var(--fg-secondary)] transition-colors duration-200 hover:text-black">Control room</p>
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
      <span className="rounded-full border border-[var(--border-1)] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em]">
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

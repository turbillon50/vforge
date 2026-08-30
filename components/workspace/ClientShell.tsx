"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconHome,
  IconCpu,
  IconRocket,
  IconActivity,
  IconKey,
  IconCreditCard,
  IconUsers,
  IconMenu,
  IconX,
} from "@/components/brand/VFIcons";
import { AccountMenu } from "@/components/account/AccountMenu";

type IconComponent = (props: { size?: number; className?: string }) => React.ReactElement | null;

type NavItem = {
  href: string;
  label: string;
  description: string;
  Icon: IconComponent;
};

const NAV: NavItem[] = [
  { href: "/workspace", label: "Inicio", description: "Panel principal", Icon: IconHome },
  { href: "/workspace/studio", label: "Construir", description: "Editor de proyectos", Icon: IconCpu },
  { href: "/workspace/apps", label: "Apps", description: "Tus aplicaciones", Icon: IconRocket },
  { href: "/workspace/actividad", label: "Actividad", description: "Registro de actividades", Icon: IconActivity },
  { href: "/workspace/conexiones", label: "Conexiones", description: "Gestión de conexiones", Icon: IconKey },
  { href: "/workspace/cobros", label: "Cobros", description: "Historial de pagos", Icon: IconCreditCard },
  { href: "/workspace/perfil", label: "Perfil", description: "Configuración de cuenta", Icon: IconUsers },
];

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
    <div className="flex h-full flex-col bg-white text-black border-r border-[var(--border-1)]">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <Link href="/workspace" onClick={onNavigate} aria-label="VForge, inicio">
          <VWordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        {NAV.map(({ href, label, description, Icon }) => {
          const active = routeIsActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 transition",
                active
                  ? "border-l-4 border-black bg-black text-white"
                  : "bg-transparent text-black hover:bg-gray-100"
              )}
            >
              <Icon size={16} className={cn(active ? "text-white" : "text-black")} />
              <div className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-gray-600">{description}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isStudio = pathname === "/workspace/studio";

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const TITLE_MAP: Record<string, string> = {
    "/workspace": "Inicio",
    "/workspace/studio": "Construir",
    "/workspace/apps": "Apps",
    "/workspace/actividad": "Actividad",
    "/workspace/conexiones": "Conexiones",
    "/workspace/cobros": "Cobros",
    "/workspace/perfil": "Perfil",
  };
  const title =
    Object.entries(TITLE_MAP).find(([path]) => routeIsActive(pathname, path))?.[1] ??
    "VForge";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-background)] text-[var(--color-ink)] md:pl-[220px]">
      {/* Sidebar for desktop */}
      <aside className="hidden md:block fixed left-0 top-0 h-full w-[220px]">
        <Sidebar pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-gray-500/30"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar navegación"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-[var(--border-1)] bg-white shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-1)] bg-white"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
            >
              <IconX size={14} />
            </button>
            <Sidebar pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className={cn("flex flex-col flex-1", isStudio ? "h-full overflow-hidden" : "min-h-svh")}>
        <header
          className={cn(
            "flex h-[58px] items-center justify-between border-b border-[var(--border-1)]",
            isStudio ? "" : "sticky top-0",
            "bg-white/95 px-4 md:px-6"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <IconMenu size={16} />
            </button>
            <div className="flex flex-col">
              <p className="text-[10px] uppercase tracking-[0.16em] text-gray-600">VForge</p>
              <h1 className="text-[15px] font-medium">{title}</h1>
            </div>
          </div>
          <AccountMenu />
        </header>

        <main
          className={cn(
            isStudio
              ? "h-[calc(100svh-58px)] overflow-hidden"
              : "flex-1 overflow-auto p-6 md:p-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
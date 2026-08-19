"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  FolderKanban,
  PlugZap,
  Rocket,
  Settings,
} from "lucide-react";
import { VMark } from "@/components/brand/VMark";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const navigation: NavItem[] = [
  { href: "/app/projects", label: "Proyectos", Icon: FolderKanban },
  { href: "/app/activity", label: "Actividad", Icon: Activity },
  { href: "/app/deployments", label: "Despliegues", Icon: Rocket },
  { href: "/app/integrations", label: "Conexiones", Icon: PlugZap },
  { href: "/app/settings", label: "Ajustes", Icon: Settings },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function currentTitle(pathname: string): string {
  if (pathname.startsWith("/app/live/")) return "Vista en vivo";
  const item = navigation.find(({ href }) => isActivePath(pathname, href));
  if (item) return item.label;

  const routeTitle: Record<string, string> = {
    "/app/chat": "Conversación",
    "/app/taller": "Taller",
    "/app/repovision": "RepoVisión",
    "/app/blueprint": "Blueprint",
    "/app/crm": "CRM",
    "/app/contracts": "Contratos",
    "/app/vault": "Baúl",
    "/app/community": "Comunidad",
    "/app/changelog": "Cambios",
    "/app/admin": "Administración",
  };

  return routeTitle[pathname] ?? "VForge";
}

function NavLink({
  item,
  pathname,
  mobile = false,
}: {
  item: NavItem;
  pathname: string;
  mobile?: boolean;
}) {
  const active = isActivePath(pathname, item.href);
  const { Icon } = item;

  if (mobile) {
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={
          "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[9px] transition " +
          (active ? "text-cyan-100" : "text-white/32 hover:text-white/65")
        }
      >
        {active ? <span className="absolute top-0 h-px w-8 bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.8)]" /> : null}
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.6} />
        <span className="max-w-full truncate px-1">{item.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={
        "group relative flex h-11 w-11 items-center justify-center rounded-xl border transition " +
        (active
          ? "border-cyan-300/15 bg-cyan-300/[0.075] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.06)]"
          : "border-transparent text-white/34 hover:border-white/[0.07] hover:bg-white/[0.03] hover:text-white/75")
      }
    >
      <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.65} />
      <span className="pointer-events-none absolute left-[54px] z-50 whitespace-nowrap rounded-lg border border-white/[0.08] bg-[#0b0b11] px-2.5 py-1.5 text-[11px] font-medium text-white/75 opacity-0 shadow-xl transition group-hover:opacity-100">
        {item.label}
      </span>
    </Link>
  );
}

export default function ProductShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { user } = useUser();
  const title = currentTitle(pathname);
  const displayName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Cuenta";

  return (
    <div className="min-h-screen bg-[#030306] text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 4%, rgba(139,92,246,.065), transparent 24%), radial-gradient(circle at 26% 100%, rgba(34,211,238,.035), transparent 26%)",
        }}
      />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-white/[0.06] bg-[#050509]/95 py-4 backdrop-blur-xl lg:flex">
        <Link href="/app/projects" aria-label="VForge — Proyectos" className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/[0.04]">
          <VMark size={22} glow />
        </Link>

        <nav aria-label="Navegación de VForge" className="mt-8 flex flex-1 flex-col items-center gap-2">
          {navigation.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex flex-col items-center gap-4">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.7)]" title="Sistemas en línea" />
          <UserButton />
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-white/[0.06] bg-[#030306]/88 backdrop-blur-2xl lg:left-[76px]">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/app/projects" aria-label="VForge" className="lg:hidden">
              <VMark size={21} />
            </Link>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-white/25 sm:inline">
              VForge
            </span>
            <span className="hidden h-3 w-px bg-white/10 sm:inline" />
            <h1 className="truncate text-sm font-medium text-white/82">{title}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[0.04] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-100/55 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
              Sistemas en línea
            </div>
            <span className="hidden max-w-32 truncate text-xs text-white/35 md:inline">
              {displayName}
            </span>
            <div className="lg:hidden">
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative min-h-screen pb-24 pt-16 lg:ml-[76px] lg:pb-0">
        {children}
      </main>

      <nav aria-label="Navegación móvil de VForge" className="fixed inset-x-0 bottom-0 z-40 flex h-[66px] border-t border-white/[0.07] bg-[#050509]/95 px-1 backdrop-blur-2xl lg:hidden">
        {navigation.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} mobile />
        ))}
      </nav>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import { Activity, Boxes, FolderKanban, Rocket } from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

type NavItem = { href: string; label: string; short: string; Icon: LucideIcon };

const navigation: NavItem[] = [
  { href: "/app/projects", label: "Proyectos", short: "Proyectos", Icon: FolderKanban },
  { href: "/app/activity", label: "Actividad", short: "Actividad", Icon: Activity },
  { href: "/app/deployments", label: "Despliegues", short: "Deploys", Icon: Rocket },
  { href: "/app/integrations", label: "Conexiones", short: "Conectar", Icon: Boxes },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeTitle(pathname: string) {
  if (pathname.startsWith("/app/live/")) return "Sala en vivo";
  return navigation.find((item) => isActive(pathname, item.href))?.label ?? "VForge";
}

function DesktopNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const { Icon } = item;
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={`group relative flex h-11 items-center gap-3 rounded-[12px] px-3 text-sm transition ${active ? "bg-[#f0ede6] font-medium text-[#1b1a17]" : "text-[#777168] hover:bg-[#f7f5ef] hover:text-[#1b1a17]"}`}>
      {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#ff5c35]" /> : null}
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.7} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function ProductShell({ children }: { children: ReactNode }) {
  if (!hasClerkPublishableKey()) {
    return (
      <ProductShellFrame
        name="Mi cuenta"
        accountControl={<span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#1b1a17] text-xs font-semibold text-white">V</span>}
      >
        {children}
      </ProductShellFrame>
    );
  }
  return <AuthenticatedProductShell>{children}</AuthenticatedProductShell>;
}

function AuthenticatedProductShell({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const name = user?.firstName || user?.fullName || user?.username || "Mi cuenta";
  return (
    <ProductShellFrame name={name} accountControl={<UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 34, height: 34 } } }} />}>
      {children}
    </ProductShellFrame>
  );
}

function ProductShellFrame({ children, name, accountControl }: { children: ReactNode; name: string; accountControl: ReactNode }) {
  const pathname = usePathname();
  const liveRoute = pathname.startsWith("/app/live/");

  return (
    <div className="vf-studio min-h-dvh bg-[#f4f1ea] text-[#1b1a17]">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-[#d9d4c9] bg-[#fbfaf7] px-4 py-5 md:flex">
          <Link href="/app/projects" aria-label="Ir a proyectos" className="w-fit px-2 text-[#1b1a17]"><VWordmark /></Link>
          <p className="mt-10 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#9a948a]">Espacio de trabajo</p>
          <nav aria-label="VForge" className="mt-3 space-y-1">
            {navigation.map((item) => <DesktopNavItem key={item.href} item={item} pathname={pathname} />)}
          </nav>

          <div className="mt-auto border-t border-[#ded9cf] pt-4">
            <div className="flex items-center gap-3 rounded-[14px] px-2 py-2">
              {accountControl}
              <div className="min-w-0"><p className="truncate text-sm font-medium text-[#1b1a17]">{name}</p><p className="mt-0.5 text-[11px] text-[#8a847a]">Propietario</p></div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-[74px] md:pb-0">
          {!liveRoute ? (
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d9d4c9] bg-[#f4f1ea]/92 px-5 backdrop-blur-xl sm:px-7 lg:px-9">
              <div><p className="text-[11px] text-[#8a847a]">VForge</p><h1 className="mt-0.5 text-base font-semibold tracking-[-0.025em] text-[#1b1a17]">{routeTitle(pathname)}</h1></div>
              <div className="flex items-center gap-2 text-xs text-[#777168]"><span className="h-2 w-2 rounded-full bg-[#58ad7b]" />Servicios conectados</div>
            </header>
          ) : null}
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-50 flex h-[74px] border-t border-[#d9d4c9] bg-[#fbfaf7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {navigation.map((item) => {
          const active = isActive(pathname, item.href);
          const { Icon } = item;
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[9px] ${active ? "font-medium text-[#1b1a17]" : "text-[#8a847a]"}`}>
              {active ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#ff5c35]" /> : null}
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.7} />
              <span className="max-w-full truncate px-1">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

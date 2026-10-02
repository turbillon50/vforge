"use client";

/* PWA móvil VForge — v1 (2026-10-02).
   Barra inferior BLANCA opaca, borde gris fino, 5 pestañas reales y botón
   central morado (único acento). Sin glass, sin blur, sin sombra de color.
   Aditivo: no sustituye ningún nav existente (drawer y botón de V se quedan).
   Pestañas = rutas que ya existen con datos reales:
   Tablero(/app/tablero) · Taller(/app/taller) · Chat(/app/chat) ·
   Blueprint(/app/blueprint) · Navegador(/app/vulcano) */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconActivity,
  IconChats,
  IconCpu,
  IconGlobe,
  IconWorkflow,
} from "@/components/brand/VFIcons";

type Tab = {
  href: string;
  label: string;
  Icon: (props: { size?: number; className?: string }) => React.ReactElement | null;
};

const TABS_IZQ: Tab[] = [
  { href: "/app/tablero", label: "Tablero", Icon: IconActivity },
  { href: "/app/taller", label: "Taller", Icon: IconCpu },
];

const TABS_DER: Tab[] = [
  { href: "/app/blueprint", label: "Blueprint", Icon: IconWorkflow },
  { href: "/app/vulcano", label: "Navegador", Icon: IconGlobe },
];

const CHAT = { href: "/app/chat", label: "Chat" };

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ tab, pathname, onNavigate }: { tab: Tab; pathname: string; onNavigate?: () => void }) {
  const active = routeIsActive(pathname, tab.href);
  const { Icon, label, href } = tab;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors duration-200",
        active
          ? "text-[var(--vf-violet-ink)]"
          : "text-[var(--fg-secondary)] hover:text-black",
      )}
    >
      <Icon size={19} className="shrink-0" />
      <span
        className={cn(
          "max-w-full truncate text-[11px] tracking-[0.02em]",
          active ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function MobileTabBar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const chatActivo = routeIsActive(pathname, CHAT.href);

  return (
    <nav
      data-vorb-avoid
      data-mobile-tabbar
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-1)] bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
        {TABS_IZQ.map((t) => (
          <TabLink key={t.href} tab={t} pathname={pathname} onNavigate={onNavigate} />
        ))}

        {/* Botón central morado: el único acento de color de la barra */}
        <Link
          href={CHAT.href}
          onClick={onNavigate}
          aria-label={CHAT.label}
          aria-current={chatActivo ? "page" : undefined}
          className="relative -mt-5 flex w-[18%] shrink-0 flex-col items-center"
        >
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full border-4 border-white text-white transition-transform duration-200 active:scale-95",
              chatActivo ? "bg-[var(--vf-violet-strong)]" : "bg-[var(--vf-violet)]",
            )}
          >
            <IconChats size={20} />
          </span>
          <span
            className={cn(
              "mt-0.5 text-[11px] tracking-[0.02em]",
              chatActivo
                ? "font-semibold text-[var(--vf-violet-ink)]"
                : "font-medium text-[var(--fg-secondary)]",
            )}
          >
            {CHAT.label}
          </span>
        </Link>

        {TABS_DER.map((t) => (
          <TabLink key={t.href} tab={t} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  );
}

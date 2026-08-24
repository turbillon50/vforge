"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconChat,
  IconExtLink,
  IconLayout,
  IconRefresh,
  IconShield,
} from "@/components/brand/VFIcons";

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

type TabId = "desktop" | "mobile" | "admin" | "info";

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function PublicLiveRoom({ project }: { project: Project }) {
  const [tab, setTab] = useState<TabId>("mobile");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInstall, setShowInstall] = useState(false);

  const urls = useMemo(() => {
    const fallback =
      normalizeUrl(project.domain) || normalizeUrl(project.vercel_url);
    return {
      desktop: normalizeUrl(project.desktop_url) || fallback,
      mobile: normalizeUrl(project.mobile_url) || normalizeUrl(project.desktop_url) || fallback,
      admin: normalizeUrl(project.admin_url),
    };
  }, [project]);

  const activeUrl =
    tab === "desktop"
      ? urls.desktop
      : tab === "mobile"
        ? urls.mobile
        : tab === "admin"
          ? urls.admin
          : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "mobile", label: "App" },
    { id: "desktop", label: "Web" },
    { id: "admin", label: "Admin" },
    { id: "info", label: "Info" },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-black">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-4">
        <VWordmark />
        <p className="truncate text-[13px] font-medium">{project.name}</p>
      </header>

      {tab !== "info" && activeUrl ? (
        <div className="flex h-10 shrink-0 items-center justify-end gap-1 border-b border-[var(--border-1)] px-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="grid h-9 w-9 place-items-center rounded-md"
            aria-label="Actualizar"
          >
            <IconRefresh size={14} />
          </button>
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-md"
            aria-label="Abrir"
          >
            <IconExtLink size={14} />
          </a>
        </div>
      ) : null}

      <main className="relative min-h-0 flex-1 overflow-hidden bg-[#f7f7f5]">
        {tab === "info" ? (
          <div className="h-full overflow-y-auto px-4 py-5">
            <p className="text-[15px] font-medium">{project.name}</p>
            <p className="mt-2 text-[13px] leading-5 text-[var(--fg-secondary)]">
              Link permanente de tu proyecto. Guárdalo, instálalo en el teléfono y
              vuelve cuando quieras.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/sign-up" className="btn-primary !min-h-11 justify-center">
                Crear cuenta gratis
              </Link>
              <button
                type="button"
                onClick={() => setShowInstall((v) => !v)}
                className="btn-ghost !min-h-11 justify-center"
              >
                Cómo instalar en el teléfono
              </button>
            </div>
            {showInstall ? (
              <div className="mt-4 rounded-xl border border-[var(--border-1)] bg-white p-4 text-[13px] leading-5 text-[var(--fg-secondary)]">
                <p className="font-medium text-black">iPhone · Safari</p>
                <p className="mt-1">Compartir → Añadir a pantalla de inicio.</p>
                <p className="mt-3 font-medium text-black">Android · Chrome</p>
                <p className="mt-1">Menú ⋮ → Instalar app / Añadir a inicio.</p>
              </div>
            ) : null}
          </div>
        ) : activeUrl ? (
          <iframe
            key={`${tab}-${refreshKey}`}
            src={activeUrl}
            title={`${project.name} ${tab}`}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <IconLayout size={22} className="mx-auto" />
              <p className="mt-3 text-[14px] font-medium">Sin URL en esta vista</p>
            </div>
          </div>
        )}
      </main>

      <nav className="shrink-0 border-t border-[var(--border-1)] bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid h-14 grid-cols-4">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={
                  active
                    ? "flex flex-col items-center justify-center gap-0.5 text-black"
                    : "flex flex-col items-center justify-center gap-0.5 text-[var(--fg-muted)]"
                }
              >
                {item.id === "info" ? (
                  <IconChat size={18} />
                ) : item.id === "admin" ? (
                  <IconShield size={18} />
                ) : (
                  <IconLayout size={18} />
                )}
                <span className="font-mono text-[8px] uppercase tracking-[0.06em]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowL,
  IconChat,
  IconCheck,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconMaximize,
  IconMenu,
  IconRefresh,
  IconSend,
  IconShield,
  IconUsers,
  IconX,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { InvitePanel } from "@/components/live/InvitePanel";

export interface LivePortalProject {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
}

export interface LivePortalMe {
  name: string;
  role: LiveRole;
  isPlatformOwner: boolean;
}

interface EventRow {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  severity: string;
  ts: string;
}

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Owner",
  reviewer: "Revisor",
  observer: "Observador",
};

type WorkspacePanelId =
  | "desktop"
  | "mobile"
  | "admin"
  | "activity"
  | "comments";
type WorkspaceBreakpoint = "lg" | "md" | "sm" | "xs";
type WorkspacePreset = "balanced" | "previews" | "review";

const ResponsiveGrid = WidthProvider(Responsive<WorkspaceBreakpoint>);

const PANEL_LABELS: Record<WorkspacePanelId, string> = {
  desktop: "Escritorio",
  mobile: "Móvil",
  admin: "Administración",
  activity: "Actividad",
  comments: "Comentarios",
};

const WORKSPACE_BREAKPOINTS: Record<WorkspaceBreakpoint, number> = {
  lg: 1200,
  md: 900,
  sm: 600,
  xs: 0,
};

const WORKSPACE_COLS: Record<WorkspaceBreakpoint, number> = {
  lg: 12,
  md: 8,
  sm: 4,
  xs: 1,
};

function presetLayouts(preset: WorkspacePreset): ResponsiveLayouts<WorkspaceBreakpoint> {
  const mobileStack: Layout = [
    { i: "desktop", x: 0, y: 0, w: 1, h: 11, minH: 7 },
    { i: "mobile", x: 0, y: 11, w: 1, h: 15, minH: 9 },
    { i: "admin", x: 0, y: 26, w: 1, h: 11, minH: 7 },
    { i: "activity", x: 0, y: 37, w: 1, h: 8, minH: 6 },
    { i: "comments", x: 0, y: 45, w: 1, h: 11, minH: 8 },
  ];

  if (preset === "previews") {
    return {
      lg: [
        { i: "desktop", x: 0, y: 0, w: 7, h: 15, minW: 4, minH: 8 },
        { i: "mobile", x: 7, y: 0, w: 2, h: 15, minW: 2, minH: 9 },
        { i: "admin", x: 9, y: 0, w: 3, h: 15, minW: 3, minH: 8 },
        { i: "activity", x: 0, y: 15, w: 5, h: 7, minW: 3, minH: 6 },
        { i: "comments", x: 5, y: 15, w: 7, h: 7, minW: 4, minH: 7 },
      ],
      md: [
        { i: "desktop", x: 0, y: 0, w: 5, h: 13, minW: 4, minH: 8 },
        { i: "mobile", x: 5, y: 0, w: 3, h: 13, minW: 2, minH: 9 },
        { i: "admin", x: 0, y: 13, w: 8, h: 11, minW: 4, minH: 8 },
        { i: "activity", x: 0, y: 24, w: 3, h: 8, minW: 3, minH: 6 },
        { i: "comments", x: 3, y: 24, w: 5, h: 8, minW: 4, minH: 7 },
      ],
      sm: mobileStack.map((item) => ({ ...item, w: 4 })),
      xs: mobileStack,
    };
  }

  if (preset === "review") {
    return {
      lg: [
        { i: "desktop", x: 0, y: 0, w: 8, h: 14, minW: 4, minH: 8 },
        { i: "mobile", x: 8, y: 0, w: 4, h: 14, minW: 2, minH: 9 },
        { i: "admin", x: 0, y: 14, w: 6, h: 11, minW: 3, minH: 8 },
        { i: "activity", x: 6, y: 14, w: 2, h: 11, minW: 2, minH: 6 },
        { i: "comments", x: 8, y: 14, w: 4, h: 11, minW: 3, minH: 7 },
      ],
      md: presetLayouts("previews").md,
      sm: mobileStack.map((item) => ({ ...item, w: 4 })),
      xs: mobileStack,
    };
  }

  return {
    lg: [
      { i: "desktop", x: 0, y: 0, w: 6, h: 13, minW: 4, minH: 8 },
      { i: "mobile", x: 6, y: 0, w: 2, h: 13, minW: 2, minH: 9 },
      { i: "admin", x: 8, y: 0, w: 4, h: 13, minW: 3, minH: 8 },
      { i: "activity", x: 0, y: 13, w: 4, h: 8, minW: 3, minH: 6 },
      { i: "comments", x: 4, y: 13, w: 8, h: 8, minW: 4, minH: 7 },
    ],
    md: presetLayouts("previews").md,
    sm: mobileStack.map((item) => ({ ...item, w: 4 })),
    xs: mobileStack,
  };
}

function timeAgo(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "fecha desconocida";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return "hace " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "hace " + hours + " h";
  return "hace " + Math.floor(hours / 24) + " d";
}

function normalizeUrl(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export function LivePortal({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const canInvite = me.role === "owner";

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="vf-mobile-stable flex h-svh overflow-hidden overscroll-none bg-[var(--color-surface)] text-[var(--color-ink)] lg:h-dvh">
      <aside
        className={cn(
          "hidden h-full shrink-0 overflow-hidden bg-[var(--color-surface)] transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-0" : "w-[208px] border-r border-[var(--border-1)]",
        )}
      >
        <div className="h-full w-[208px]">
          <LiveSidebar project={project} me={me} />
        </div>
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-black bg-white">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] bg-white"
              aria-label="Cerrar menú"
            >
              <IconX size={14} />
            </button>
            <LiveSidebar project={project} me={me} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[74px] shrink-0 items-center justify-between gap-4 border-b border-[var(--border-1)] bg-white px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--border-1)] lg:hidden"
              aria-label="Abrir menú"
            >
              <IconMenu size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--border-1)] lg:grid"
              aria-label={sidebarCollapsed ? "Mostrar navegación" : "Ocultar navegación"}
              aria-pressed={sidebarCollapsed}
            >
              <IconMenu size={16} />
            </button>
            <div className="min-w-0">
              <p className="mono-label flex items-center gap-2">
                <span className="status-shape" data-active="true" />
                Portal autorizado · {project.status}
              </p>
              <h1 className="mt-1 truncate text-[22px] font-medium tracking-[-0.04em] md:text-[26px]">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] sm:inline-flex">
              {ROLE_LABEL[me.role]}
            </span>
            {canInvite ? (
              <a href="#live-invitations" className="btn-primary !min-h-9 !px-3">
                <IconUsers size={12} /> <span className="hidden sm:inline">Invitar</span>
              </a>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-background)]">
          <LiveWorkspace project={project} me={me} canSeeAdmin={canSeeAdmin} />
          <div className="px-3 pb-3 md:px-4 md:pb-4">
            {canInvite ? (
              <div id="live-invitations" className="scroll-mt-4">
                <InvitePanel projectId={project.id} />
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function LiveWorkspace({
  project,
  me,
  canSeeAdmin,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
  canSeeAdmin: boolean;
}) {
  const storageKey = `vforge:live-layout:v2:${project.id}:${me.role}`;
  const availablePanels = useMemo<WorkspacePanelId[]>(
    () => [
      "desktop",
      "mobile",
      ...(canSeeAdmin ? (["admin"] as WorkspacePanelId[]) : []),
      "activity",
      "comments",
    ],
    [canSeeAdmin],
  );
  const [layouts, setLayouts] = useState<ResponsiveLayouts<WorkspaceBreakpoint>>(
    () => presetLayouts("balanced"),
  );
  const [hiddenPanels, setHiddenPanels] = useState<WorkspacePanelId[]>([]);
  const [focusedPanel, setFocusedPanel] = useState<WorkspacePanelId | null>(null);
  const [breakpoint, setBreakpoint] = useState<WorkspaceBreakpoint>("lg");
  const [interacting, setInteracting] = useState(false);
  const [hydratedLayout, setHydratedLayout] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          layouts?: ResponsiveLayouts<WorkspaceBreakpoint>;
          hiddenPanels?: WorkspacePanelId[];
        };
        if (parsed.layouts?.lg && parsed.layouts?.xs) setLayouts(parsed.layouts);
        if (Array.isArray(parsed.hiddenPanels)) {
          setHiddenPanels(
            parsed.hiddenPanels.filter((panel) => availablePanels.includes(panel)),
          );
        }
      }
    } catch {
      // Un layout local viejo nunca debe impedir abrir la sala.
    } finally {
      setHydratedLayout(true);
    }
  }, [availablePanels, storageKey]);

  useEffect(() => {
    if (!hydratedLayout) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ layouts, hiddenPanels }),
    );
  }, [hiddenPanels, hydratedLayout, layouts, storageKey]);

  const visiblePanels = availablePanels.filter(
    (panel) => !hiddenPanels.includes(panel) && (!focusedPanel || focusedPanel === panel),
  );
  const activeLayouts = useMemo<ResponsiveLayouts<WorkspaceBreakpoint>>(() => {
    if (!focusedPanel) return layouts;
    return Object.fromEntries(
      (Object.keys(WORKSPACE_COLS) as WorkspaceBreakpoint[]).map((key) => [
        key,
        [
          {
            i: focusedPanel,
            x: 0,
            y: 0,
            w: WORKSPACE_COLS[key],
            h: key === "xs" ? 18 : 20,
            minH: 8,
          },
        ],
      ]),
    ) as ResponsiveLayouts<WorkspaceBreakpoint>;
  }, [focusedPanel, layouts]);

  function applyPreset(preset: WorkspacePreset) {
    setFocusedPanel(null);
    setHiddenPanels([]);
    setLayouts(presetLayouts(preset));
  }

  function togglePanel(panel: WorkspacePanelId) {
    setFocusedPanel(null);
    setHiddenPanels((current) =>
      current.includes(panel)
        ? current.filter((item) => item !== panel)
        : [...current, panel],
    );
  }

  const focusAction = (panel: WorkspacePanelId) =>
    setFocusedPanel((current) => (current === panel ? null : panel));
  const compact = breakpoint === "sm" || breakpoint === "xs";

  return (
    <div className="min-w-0 px-2 py-2 md:px-3 md:py-3">
      <div className="mb-2 flex min-w-0 items-center gap-2 overflow-x-auto rounded-[8px] border border-[var(--border-1)] bg-white p-2 no-scrollbar">
        <div className="flex shrink-0 items-center gap-1 border-r border-[var(--border-1)] pr-2">
          {(["balanced", "previews", "review"] as WorkspacePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-md border border-transparent px-2.5 py-2 font-mono text-[8px] uppercase tracking-[0.1em] hover:border-black"
            >
              {preset === "balanced" ? "Balance" : preset === "previews" ? "Previews" : "Revisión"}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1" aria-label="Paneles visibles">
          {availablePanels.map((panel) => {
            const visible = !hiddenPanels.includes(panel);
            return (
              <button
                key={panel}
                type="button"
                onClick={() => togglePanel(panel)}
                aria-pressed={visible}
                className={cn(
                  "rounded-md border px-2.5 py-2 font-mono text-[8px] uppercase tracking-[0.1em]",
                  visible ? "border-black bg-black text-white" : "border-[var(--border-1)] bg-white text-black",
                )}
              >
                {PANEL_LABELS[panel]}
              </button>
            );
          })}
        </div>
        <p className="ml-auto hidden shrink-0 px-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)] lg:block">
          Arrastra el encabezado · ajusta desde la esquina
        </p>
      </div>

      {visiblePanels.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center rounded-[8px] border border-dashed border-black bg-white p-8 text-center">
          <div>
            <IconLayout size={22} className="mx-auto" />
            <p className="mt-3 text-[13px] font-medium">No hay paneles visibles</p>
            <button type="button" onClick={() => applyPreset("balanced")} className="btn-secondary mt-4">
              Restaurar workspace
            </button>
          </div>
        </div>
      ) : (
        <ResponsiveGrid
          className={cn("live-workspace-grid", interacting && "live-grid-is-interacting")}
          layouts={activeLayouts}
          breakpoints={WORKSPACE_BREAKPOINTS}
          cols={WORKSPACE_COLS}
          rowHeight={28}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          compactType="vertical"
          isBounded
          isDraggable={!compact && !focusedPanel}
          isResizable={!compact && !focusedPanel}
          useCSSTransforms={!compact}
          draggableHandle=".live-grid-drag-handle"
          draggableCancel="button,a,textarea,input,iframe"
          resizeHandles={["se", "s", "e"]}
          measureBeforeMount
          onBreakpointChange={(next) => setBreakpoint(next)}
          onLayoutChange={(_, nextLayouts) => {
            if (focusedPanel) return;
            setLayouts((current) => {
              const merged = Object.fromEntries(
                (Object.keys(WORKSPACE_COLS) as WorkspaceBreakpoint[]).map((key) => {
                  const incoming = nextLayouts[key] ?? [];
                  const incomingIds = new Set(incoming.map((item) => item.i));
                  const preserved = (current[key] ?? []).filter(
                    (item) => !incomingIds.has(item.i),
                  );
                  return [key, [...incoming, ...preserved]];
                }),
              ) as ResponsiveLayouts<WorkspaceBreakpoint>;
              return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
            });
          }}
          onDragStart={() => setInteracting(true)}
          onDragStop={() => setInteracting(false)}
          onResizeStart={() => setInteracting(true)}
          onResizeStop={() => setInteracting(false)}
        >
          {visiblePanels.includes("desktop") ? (
            <div key="desktop">
              <Viewport kind="desktop" title="Escritorio" url={project.desktop_url} fill onFocus={() => focusAction("desktop")} focused={focusedPanel === "desktop"} />
            </div>
          ) : null}
          {visiblePanels.includes("mobile") ? (
            <div key="mobile">
              <Viewport kind="mobile" title="Móvil" url={project.mobile_url} fill onFocus={() => focusAction("mobile")} focused={focusedPanel === "mobile"} />
            </div>
          ) : null}
          {visiblePanels.includes("admin") ? (
            <div key="admin">
              <Viewport kind="admin" title="Administración" url={project.admin_url} fill onFocus={() => focusAction("admin")} focused={focusedPanel === "admin"} />
            </div>
          ) : null}
          {visiblePanels.includes("activity") ? (
            <div key="activity">
              <ActivityFeed projectId={project.id} workspace onFocus={() => focusAction("activity")} focused={focusedPanel === "activity"} />
            </div>
          ) : null}
          {visiblePanels.includes("comments") ? (
            <div key="comments">
              <CommentsPanel projectId={project.id} workspace onFocus={() => focusAction("comments")} focused={focusedPanel === "comments"} />
            </div>
          ) : null}
        </ResponsiveGrid>
      )}
    </div>
  );
}

function FocusButton({ focused, onClick, label }: { focused: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
      aria-label={focused ? `Restaurar ${label}` : `Ampliar ${label}`}
      title={focused ? "Restaurar" : "Ampliar"}
    >
      {focused ? <IconX size={11} /> : <IconMaximize size={11} />}
    </button>
  );
}

function LiveSidebar({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const views = [
    { label: "Escritorio", available: Boolean(normalizeUrl(project.desktop_url)) },
    { label: "Móvil", available: Boolean(normalizeUrl(project.mobile_url)) },
    {
      label: "Administración",
      available:
        (me.role === "owner" || me.role === "reviewer") &&
        Boolean(normalizeUrl(project.admin_url)),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <VWordmark />
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.17em] text-[var(--fg-muted)]">
          Live control room
        </p>
      </div>

      <div className="px-4 py-5">
        <Link
          href={me.isPlatformOwner ? "/app/projects" : "/workspace"}
          className="inline-flex items-center gap-2 text-[11px] text-[var(--fg-muted)] hover:text-black"
        >
          <IconArrowL size={12} /> Proyectos
        </Link>

        <div className="mt-7 border-l-2 border-black pl-3">
          <p className="text-[13px] font-medium leading-5 text-black">{project.name}</p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--fg-muted)]">
            {ROLE_LABEL[me.role]}
          </p>
        </div>
      </div>

      <nav className="border-t border-[var(--border-1)] px-4 py-5" aria-label="Vistas de la sala">
        <p className="mono-label mb-3">Viewports</p>
        <div className="space-y-1">
          {views.map((view) => (
            <div
              key={view.label}
              className="flex items-center justify-between rounded-md px-2 py-2 text-[11px]"
            >
              <span>{view.label}</span>
              <span
                className="status-shape"
                data-active={view.available}
                aria-label={view.available ? "Disponible" : "No disponible"}
              />
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-[var(--border-1)] px-5 py-5">
        <p className="mono-label">Estado del proyecto</p>
        <p className="mt-2 break-words text-[11px] text-black">{project.status}</p>
        <p className="mt-4 text-[9px] leading-4 text-[var(--fg-muted)]">
          La sala sólo muestra URLs y eventos autorizados para este proyecto.
        </p>
      </div>
    </div>
  );
}

function Viewport({
  kind,
  title,
  url: rawUrl,
  className,
  fill = false,
  focused = false,
  onFocus,
}: {
  kind: "desktop" | "mobile" | "admin";
  title: string;
  url: string | null;
  className?: string;
  fill?: boolean;
  focused?: boolean;
  onFocus?: () => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const frameClass =
    fill
      ? "min-h-0 flex-1"
      : kind === "mobile"
      ? "min-h-[520px] aspect-[9/16] xl:min-h-[380px] 2xl:min-h-[520px]"
      : "min-h-[380px] aspect-[16/10]";

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white",
        fill && "flex h-full flex-col",
        className,
      )}
    >
      <header className="live-grid-drag-handle flex h-10 shrink-0 cursor-grab items-center justify-between border-b border-[var(--border-1)] px-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          {kind === "admin" ? <IconShield size={12} /> : <IconLayout size={12} />}
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {url ? (
            <>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
              aria-label={"Actualizar vista " + title}
            >
              <IconRefresh size={11} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
              aria-label={"Abrir vista " + title + " en otra pestaña"}
            >
              <IconExtLink size={11} />
            </a>
            </>
          ) : null}
          {onFocus ? <FocusButton focused={focused} onClick={onFocus} label={title} /> : null}
        </div>
      </header>

      {url ? (
        <div className={cn("relative w-full overflow-hidden bg-white", frameClass)}>
          <iframe
            key={refreshKey}
            src={url}
            title={"Vista " + title + " de " + rawUrl}
            className={cn(
              "absolute inset-0 h-full w-full border-0 bg-white",
              kind === "mobile" && fill && "left-1/2 max-w-[430px] -translate-x-1/2 border-x border-[var(--border-1)]",
            )}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className={cn("grid w-full place-items-center bg-white p-6 text-center", frameClass)}>
          <div>
            <p className="text-[12px] font-medium text-black">
              Sin URL para {title.toLowerCase()}
            </p>
            <p className="mt-2 max-w-xs text-[10px] leading-4 text-[var(--fg-muted)]">
              Esta vista aparecerá cuando el proyecto tenga una URL autorizada.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ActivityFeed({
  projectId,
  rail = false,
  workspace = false,
  focused = false,
  onFocus,
}: {
  projectId: string;
  rail?: boolean;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<
    "connecting" | "live" | "reconnecting"
  >("connecting");
  const sinceRef = useRef<string | null>(null);

  const mergeEvents = useCallback((incoming: EventRow[]) => {
    if (incoming.length === 0) return;
    setEvents((previous) => {
      const existing = new Set(previous.map((event) => event.id));
      const fresh = incoming.filter((event) => !existing.has(event.id));
      return [...fresh, ...previous].slice(0, 60);
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const suffix = sinceRef.current
        ? "?since=" + encodeURIComponent(sinceRef.current)
        : "";
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/events" + suffix,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError("No se pudo leer la actividad.");
        return;
      }
      const payload = (await response.json()) as {
        events?: EventRow[];
        serverTime?: string;
      };
      const next = Array.isArray(payload.events) ? payload.events : [];
      if (next.length > 0) {
        sinceRef.current = next[0]?.ts ?? sinceRef.current;
        mergeEvents(next);
      } else if (!sinceRef.current && payload.serverTime) {
        sinceRef.current = payload.serverTime;
      }
      setError(null);
    } catch {
      setError("La actividad no está disponible en este momento.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId, mergeEvents]);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    async function connect() {
      await poll();
      if (cancelled) return;
      const suffix = sinceRef.current
        ? "?since=" + encodeURIComponent(sinceRef.current)
        : "";
      source = new EventSource(
        "/api/live/" + encodedProjectId + "/events/stream" + suffix,
      );
      source.onopen = () => setStreamState("live");
      source.onerror = () => setStreamState("reconnecting");
      source.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data) as { event?: EventRow };
          if (!payload.event) return;
          sinceRef.current = payload.event.ts;
          mergeEvents([payload.event]);
        } catch {
          // Un frame inválido no interrumpe el canal.
        }
      };
    }

    void connect();
    const fallback = window.setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      source?.close();
      window.clearInterval(fallback);
    };
  }, [encodedProjectId, mergeEvents, poll]);

  return (
    <section
      className={cn(
        "bg-white",
        workspace
          ? "flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] p-4"
          : rail
          ? "border-b border-[var(--border-1)] px-5 py-5"
          : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
      aria-live="polite"
    >
      <div className={cn("flex items-center justify-between gap-3", workspace && "live-grid-drag-handle -mx-4 -mt-4 h-10 shrink-0 cursor-grab border-b border-[var(--border-1)] px-4 active:cursor-grabbing")}>
        <div className="flex items-center gap-2">
          <IconActivity size={13} />
          <h2 className="text-[12px] font-medium">Actividad en vivo</h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            <span
              className="status-shape"
              data-active={streamState === "live"}
            />
            {streamState === "live" ? "Conectado" : "Conectando"}
          </span>
          {onFocus ? <FocusButton focused={focused} onClick={onFocus} label="actividad" /> : null}
        </div>
      </div>

      {!loaded ? (
        <div className="grid min-h-28 place-items-center">
          <IconLoader size={14} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="mt-5 border-l border-black pl-3 text-[11px] leading-5">{error}</p>
      ) : events.length === 0 ? (
        <p className="mt-5 border-l border-[var(--border-1)] pl-3 text-[11px] leading-5 text-[var(--fg-muted)]">
          Aún no hay eventos registrados para este proyecto.
        </p>
      ) : (
        <div className={cn("mt-5 space-y-4 overflow-y-auto pr-1", workspace ? "min-h-0 flex-1" : rail ? "max-h-[300px]" : "max-h-[360px]")}>
          {events.map((event) => (
            <article key={event.id} className="border-l border-black/20 pl-3">
              <div className="flex items-start justify-between gap-2">
                <p className="break-words text-[11px] font-medium text-black">
                  {event.event_type}
                </p>
                <span className="mt-1 status-shape shrink-0" data-active={event.severity === "critical"} />
              </div>
              {typeof event.details?.message === "string" ? (
                <p className="mt-1 break-words text-[10px] leading-4 text-[var(--fg-muted)]">
                  {event.details.message}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[8px] text-[var(--fg-muted)]">
                {timeAgo(event.ts)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentsPanel({
  projectId,
  rail = false,
  workspace = false,
  focused = false,
  onFocus,
}: {
  projectId: string;
  rail?: boolean;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/comments",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError("No se pudieron cargar los comentarios.");
        return;
      }
      const payload = (await response.json()) as { comments?: CommentRow[] };
      setComments(Array.isArray(payload.comments) ? payload.comments : []);
      setError(null);
    } catch {
      setError("Los comentarios no están disponibles.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/comments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        },
      );
      if (!response.ok) {
        setError("No se pudo publicar el comentario.");
        return;
      }
      setBody("");
      await load();
    } catch {
      setError("No se pudo publicar el comentario.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "bg-white",
        workspace
          ? "flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] p-4"
          : rail
            ? "px-5 py-5"
            : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", workspace && "live-grid-drag-handle -mx-4 -mt-4 h-10 shrink-0 cursor-grab border-b border-[var(--border-1)] px-4 active:cursor-grabbing")}>
        <div className="flex items-center gap-2">
          <IconChat size={13} />
          <h2 className="text-[12px] font-medium">Comentarios</h2>
        </div>
        {onFocus ? <FocusButton focused={focused} onClick={onFocus} label="comentarios" /> : null}
      </div>

      <div className="mt-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder="Deja una observación…"
          className="w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2.5 text-[12px] text-black placeholder:text-[var(--fg-muted)] focus:border-black"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !body.trim()}
          className="btn-primary mt-2 w-full disabled:opacity-40"
        >
          {busy ? <IconLoader size={13} className="animate-spin" /> : <IconSend size={13} />}
          Comentar
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[10px] leading-4 text-black">{error}</p>
      ) : null}

      <div className={cn("mt-5 space-y-3 overflow-y-auto pr-1", workspace ? "min-h-0 flex-1" : rail ? "max-h-[360px]" : "max-h-[300px]")}>
        {!loaded ? (
          <div className="grid min-h-20 place-items-center">
            <IconLoader size={13} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">
            No hay comentarios todavía.
          </p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-md border border-[var(--border-1)] bg-[#f7f7f5] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-medium text-black">
                  {comment.author_name ?? comment.author_email}
                </p>
                <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-[var(--fg-secondary)]">
                {comment.body}
              </p>
            </article>
          ))
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
        <IconCheck size={10} /> Sólo miembros del proyecto
      </p>
    </section>
  );
}

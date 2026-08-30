"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Group,
  Panel,
  Separator,
  useGroupRef,
  usePanelRef,
  type Layout as DockLayout,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowL,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconMap,
  IconMaximize,
  IconMenu,
  IconRefresh,
  IconShield,
  IconUsers,
  IconX,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { InvitePanel } from "@/components/live/InvitePanel";
import { CommentsPanel } from "@/components/live/CommentsPanel";
import { ProjectContextPanel } from "@/components/live/ProjectContextPanel";
import { ReviewContextProvider, useReviewContext } from "@/components/live/ReviewContext";
import { ReviewNotesTray } from "@/components/live/ReviewNotesTray";
import {
  anchorViewportPosition,
  documentPointForAnchor,
  parseReviewBridgeViewport,
  type ReviewAnchor,
  type ReviewBridgeViewport,
} from "@/lib/live/review-context";

const CodeEditorPanel = dynamic(
  () => import("@/components/live/CodeEditorPanel").then((module) => module.CodeEditorPanel),
  { ssr: false },
);

const ReferencesPanel = dynamic(
  () => import("@/components/live/ReferencesPanel").then((module) => module.ReferencesPanel),
  { ssr: false },
);

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
  | "comments"
  | "context"
  | "code"
  | "references";
type WorkspacePreset = "balanced" | "previews" | "review";
type PreviewKind = "desktop" | "mobile" | "admin";

interface PreviewSpec {
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  label: string;
}

const PREVIEW_SPECS: Record<PreviewKind, PreviewSpec> = {
  desktop: {
    width: 1440,
    height: 900,
    frameWidth: 1440,
    frameHeight: 900,
    label: "1440 × 900",
  },
  mobile: {
    width: 390,
    height: 844,
    frameWidth: 414,
    frameHeight: 884,
    label: "390 × 844",
  },
  admin: {
    width: 1280,
    height: 800,
    frameWidth: 1280,
    frameHeight: 800,
    label: "1280 × 800",
  },
};

const PANEL_LABELS: Record<WorkspacePanelId, string> = {
  desktop: "Escritorio",
  mobile: "Móvil",
  admin: "Administración",
  activity: "Actividad",
  comments: "Comentarios",
  context: "Contexto",
  code: "Código",
  references: "Referencias",
};


const DOCK_LAYOUTS: Record<WorkspacePreset, { root: DockLayout; previews: DockLayout; feedback: DockLayout }> = {
  balanced: {
    root: { previews: 68, feedback: 32 },
    previews: { desktop: 52, mobile: 20, admin: 28 },
    feedback: { activity: 24, comments: 42, context: 34 },
  },
  previews: {
    root: { previews: 78, feedback: 22 },
    previews: { desktop: 60, mobile: 18, admin: 22 },
    feedback: { activity: 28, comments: 40, context: 32 },
  },
  review: {
    root: { previews: 58, feedback: 42 },
    previews: { desktop: 58, mobile: 22, admin: 20 },
    feedback: { activity: 20, comments: 48, context: 32 },
  },
};

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const canInvite = me.role === "owner";

  useEffect(() => {
    if (!drawerOpen && !inviteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setInviteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, inviteOpen]);

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

      {inviteOpen ? (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Invitar al proyecto">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setInviteOpen(false)}
            aria-label="Cerrar invitaciones"
          />
          <aside className="absolute inset-y-0 right-0 w-[min(92vw,420px)] overflow-y-auto border-l border-black bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="absolute right-3 top-2 z-10 grid h-8 w-8 place-items-center rounded-md border border-[var(--border-1)] bg-white hover:border-black"
              aria-label="Cerrar invitaciones"
            >
              <IconX size={12} />
            </button>
            <InvitePanel projectId={project.id} compact />
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
              <button type="button" onClick={() => setInviteOpen(true)} className="btn-primary !min-h-9 !px-3">
                <IconUsers size={12} /> <span className="hidden sm:inline">Invitar</span>
              </button>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--color-background)]">
          <LiveWorkspace project={project} me={me} canSeeAdmin={canSeeAdmin} />
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
  const storageKey = `vforge:dock-layout:v1:${project.id}:${me.role}`;
  const availablePanels = useMemo<WorkspacePanelId[]>(
    () => [
      "desktop",
      "mobile",
      ...(canSeeAdmin ? (["admin"] as WorkspacePanelId[]) : []),
      "activity",
      "comments",
      "context",
      "code",
      "references",
    ],
    [canSeeAdmin],
  );
  const rootGroupRef = useGroupRef();
  const previewsGroupRef = useGroupRef();
  const feedbackGroupRef = useGroupRef();
  const desktopRef = usePanelRef();
  const mobileRef = usePanelRef();
  const adminRef = usePanelRef();
  const activityRef = usePanelRef();
  const commentsRef = usePanelRef();
  const contextRef = usePanelRef();
  const [focusedPanel, setFocusedPanel] = useState<WorkspacePanelId | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<WorkspacePanelId, boolean>>({
    desktop: false,
    mobile: false,
    admin: false,
    activity: false,
    comments: false,
    context: false,
    code: false,
    references: false,
  });
  const savedLayoutsRef = useRef(DOCK_LAYOUTS.balanced);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 649px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!focusedPanel) return;
    const restoreWorkspace = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusedPanel(null);
    };
    window.addEventListener("keydown", restoreWorkspace);
    return () => window.removeEventListener("keydown", restoreWorkspace);
  }, [focusedPanel]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<typeof DOCK_LAYOUTS.balanced>;
      const next = {
        root: normalizeDockLayout(parsed.root, ["previews", "feedback"], DOCK_LAYOUTS.balanced.root),
        previews: normalizeDockLayout(
          parsed.previews,
          canSeeAdmin ? ["desktop", "mobile", "admin"] : ["desktop", "mobile"],
          DOCK_LAYOUTS.balanced.previews,
        ),
        feedback: normalizeDockLayout(parsed.feedback, ["activity", "comments", "context"], DOCK_LAYOUTS.balanced.feedback),
      };
      savedLayoutsRef.current = next;
      window.requestAnimationFrame(() => {
        rootGroupRef.current?.setLayout(next.root);
        previewsGroupRef.current?.setLayout(next.previews);
        feedbackGroupRef.current?.setLayout(next.feedback);
      });
    } catch {
      // Una preferencia local dañada nunca debe impedir abrir la sala.
    }
  }, [canSeeAdmin, feedbackGroupRef, previewsGroupRef, rootGroupRef, storageKey]);

  const saveLayout = useCallback(
    (key: "root" | "previews" | "feedback", layout: DockLayout) => {
      savedLayoutsRef.current = { ...savedLayoutsRef.current, [key]: layout };
      window.localStorage.setItem(storageKey, JSON.stringify(savedLayoutsRef.current));
    },
    [storageKey],
  );

  function applyPreset(preset: WorkspacePreset) {
    const source = DOCK_LAYOUTS[preset];
    const next = {
      root: source.root,
      previews: normalizeDockLayout(
        source.previews,
        canSeeAdmin ? ["desktop", "mobile", "admin"] : ["desktop", "mobile"],
        source.previews,
      ),
      feedback: source.feedback,
    };
    setFocusedPanel(null);
    setCollapsed({ desktop: false, mobile: false, admin: false, activity: false, comments: false, context: false, code: false, references: false });
    desktopRef.current?.expand();
    mobileRef.current?.expand();
    adminRef.current?.expand();
    activityRef.current?.expand();
    commentsRef.current?.expand();
    contextRef.current?.expand();
    rootGroupRef.current?.setLayout(next.root);
    previewsGroupRef.current?.setLayout(next.previews);
    feedbackGroupRef.current?.setLayout(next.feedback);
    savedLayoutsRef.current = next;
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function togglePanel(panel: WorkspacePanelId, handle: PanelImperativeHandle | null) {
    setFocusedPanel(null);
    if (handle?.isCollapsed()) handle.expand();
    else handle?.collapse();
  }

  const focusAction = (panel: WorkspacePanelId) =>
    setFocusedPanel((current) => (current === panel ? null : panel));

  const panelHandles: Record<WorkspacePanelId, PanelImperativeHandle | null> = {
    desktop: desktopRef.current,
    mobile: mobileRef.current,
    admin: adminRef.current,
    activity: activityRef.current,
    comments: commentsRef.current,
    context: contextRef.current,
    code: null,
    references: null,
  };

  const updateCollapsed = (panel: WorkspacePanelId, pixels: number) => {
    const next = pixels <= 48;
    setCollapsed((current) => current[panel] === next ? current : { ...current, [panel]: next });
  };

  const focusedContent = focusedPanel === "desktop" ? (
    <Viewport kind="desktop" title="Escritorio" url={project.desktop_url} fill onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "mobile" ? (
    <Viewport kind="mobile" title="Móvil" url={project.mobile_url} fill onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "admin" ? (
    <Viewport kind="admin" title="Administración" url={project.admin_url} fill onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "activity" ? (
    <ActivityFeed projectId={project.id} workspace onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "comments" ? (
    <CommentsPanel projectId={project.id} projectName={project.name} canAccept={me.role === "owner" || me.isPlatformOwner} workspace onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "context" ? (
    <ProjectContextPanel projectId={project.id} workspace onFocus={() => setFocusedPanel(null)} focused />
  ) : focusedPanel === "code" ? (
    <CodeEditorPanel projectId={project.id} onClose={() => setFocusedPanel(null)} />
  ) : focusedPanel === "references" ? (
    <ReferencesPanel projectId={project.id} onClose={() => setFocusedPanel(null)} />
  ) : null;

  return (
    <ReviewContextProvider>
    <div className="min-w-0 px-2 py-2 md:px-3 md:py-3">
      <div className="sticky top-0 z-40 mb-2 flex min-w-0 items-center gap-2 overflow-x-auto rounded-[8px] border border-[var(--border-1)] bg-white p-2 shadow-[0_8px_20px_-18px_rgba(0,0,0,0.8)] no-scrollbar">
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
            const standalone = panel === "code" || panel === "references";
            const visible = standalone ? focusedPanel === panel : !collapsed[panel];
            return (
              <button
                key={panel}
                type="button"
                onClick={() => standalone ? focusAction(panel) : togglePanel(panel, panelHandles[panel])}
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
          Arrastra cualquier divisor · doble clic restaura
        </p>
      </div>

      {focusedContent ? (
        <div className="h-[calc(100dvh-160px)] min-h-[520px] overflow-hidden rounded-[8px] bg-white" aria-label="Panel ampliado">
          {focusedContent}
        </div>
      ) : (
        <div className="h-[calc(100dvh-160px)] min-h-[560px] overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-[#f2f2f0]">
          <Group
            id={`workspace-${project.id}`}
            orientation="vertical"
            groupRef={rootGroupRef}
            defaultLayout={DOCK_LAYOUTS.balanced.root}
            onLayoutChanged={(layout) => saveLayout("root", layout)}
          >
            <Panel id="previews" minSize={180}>
              <Group
                id={`previews-${project.id}`}
                orientation={isMobile ? "vertical" : "horizontal"}
                groupRef={previewsGroupRef}
                defaultLayout={normalizeDockLayout(
                  DOCK_LAYOUTS.balanced.previews,
                  canSeeAdmin ? ["desktop", "mobile", "admin"] : ["desktop", "mobile"],
                  DOCK_LAYOUTS.balanced.previews,
                )}
                onLayoutChanged={(layout) => saveLayout("previews", layout)}
              >
                <Panel id="desktop" panelRef={desktopRef} collapsible collapsedSize={42} minSize={isMobile ? 120 : 150} onResize={(size) => updateCollapsed("desktop", size.inPixels)}>
                  {collapsed.desktop ? <CollapsedDockPanel label="Escritorio" vertical={!isMobile} onRestore={() => desktopRef.current?.expand()} /> : <Viewport kind="desktop" title="Escritorio" url={project.desktop_url} fill onFocus={() => focusAction("desktop")} onMinimize={() => desktopRef.current?.collapse()} />}
                </Panel>
                <DockSeparator horizontal={!isMobile} />
                <Panel id="mobile" panelRef={mobileRef} collapsible collapsedSize={42} minSize={isMobile ? 120 : 120} onResize={(size) => updateCollapsed("mobile", size.inPixels)}>
                  {collapsed.mobile ? <CollapsedDockPanel label="Móvil" vertical={!isMobile} onRestore={() => mobileRef.current?.expand()} /> : <Viewport kind="mobile" title="Móvil" url={project.mobile_url} fill onFocus={() => focusAction("mobile")} onMinimize={() => mobileRef.current?.collapse()} />}
                </Panel>
                {canSeeAdmin ? <DockSeparator horizontal={!isMobile} /> : null}
                {canSeeAdmin ? (
                  <Panel id="admin" panelRef={adminRef} collapsible collapsedSize={42} minSize={isMobile ? 120 : 150} onResize={(size) => updateCollapsed("admin", size.inPixels)}>
                    {collapsed.admin ? <CollapsedDockPanel label="Administración" vertical={!isMobile} onRestore={() => adminRef.current?.expand()} /> : <Viewport kind="admin" title="Administración" url={project.admin_url} fill onFocus={() => focusAction("admin")} onMinimize={() => adminRef.current?.collapse()} />}
                  </Panel>
                ) : null}
              </Group>
            </Panel>
            <DockSeparator horizontal={false} />
            <Panel id="feedback" minSize={150}>
              <Group
                id={`feedback-${project.id}`}
                orientation={isMobile ? "vertical" : "horizontal"}
                groupRef={feedbackGroupRef}
                defaultLayout={DOCK_LAYOUTS.balanced.feedback}
                onLayoutChanged={(layout) => saveLayout("feedback", layout)}
              >
                <Panel id="activity" panelRef={activityRef} collapsible collapsedSize={42} minSize={isMobile ? 100 : 140} onResize={(size) => updateCollapsed("activity", size.inPixels)}>
                  {collapsed.activity ? <CollapsedDockPanel label="Actividad" vertical={!isMobile} onRestore={() => activityRef.current?.expand()} /> : <ActivityFeed projectId={project.id} workspace onFocus={() => focusAction("activity")} onMinimize={() => activityRef.current?.collapse()} />}
                </Panel>
                <DockSeparator horizontal={!isMobile} />
                <Panel id="comments" panelRef={commentsRef} collapsible collapsedSize={42} minSize={isMobile ? 120 : 180} onResize={(size) => updateCollapsed("comments", size.inPixels)}>
                  {collapsed.comments ? <CollapsedDockPanel label="Comentarios" vertical={!isMobile} onRestore={() => commentsRef.current?.expand()} /> : <CommentsPanel projectId={project.id} projectName={project.name} canAccept={me.role === "owner" || me.isPlatformOwner} workspace onFocus={() => focusAction("comments")} onMinimize={() => commentsRef.current?.collapse()} />}
                </Panel>
                <DockSeparator horizontal={!isMobile} />
                <Panel id="context" panelRef={contextRef} collapsible collapsedSize={42} minSize={isMobile ? 120 : 180} onResize={(size) => updateCollapsed("context", size.inPixels)}>
                  {collapsed.context ? <CollapsedDockPanel label="Contexto" vertical={!isMobile} onRestore={() => contextRef.current?.expand()} /> : <ProjectContextPanel projectId={project.id} workspace onFocus={() => focusAction("context")} onMinimize={() => contextRef.current?.collapse()} />}
                </Panel>
              </Group>
            </Panel>
          </Group>
        </div>
      )}
    </div>
    <ReviewNotesTray projectId={project.id} />
    </ReviewContextProvider>
  );
}

function normalizeDockLayout(
  layout: DockLayout | undefined,
  ids: string[],
  fallback: DockLayout,
): DockLayout {
  const source = layout && ids.every((id) => Number.isFinite(layout[id]) && layout[id] > 0) ? layout : fallback;
  const total = ids.reduce((sum, id) => sum + (source[id] ?? fallback[id] ?? 1), 0);
  return Object.fromEntries(ids.map((id) => [id, ((source[id] ?? fallback[id] ?? 1) / total) * 100]));
}

function DockSeparator({ horizontal }: { horizontal: boolean }) {
  return <Separator className={cn("dock-separator", horizontal ? "dock-separator-vertical" : "dock-separator-horizontal")} />;
}

function CollapsedDockPanel({ label, vertical, onRestore }: { label: string; vertical: boolean; onRestore: () => void }) {
  return (
    <button type="button" onClick={onRestore} className="flex h-full w-full items-center justify-center gap-2 bg-white font-mono text-[8px] uppercase tracking-[0.12em] hover:bg-[#f7f7f5]" aria-label={`Restaurar ${label}`} title={`Restaurar ${label}`}>
      <IconLayout size={11} />
      <span className={cn(vertical && "[writing-mode:vertical-rl]")}>{label}</span>
    </button>
  );
}

function MinimizeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]" aria-label={`Minimizar ${label}`} title="Minimizar">
      <span className="h-px w-3 bg-current" />
    </button>
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
  onMinimize,
}: {
  kind: "desktop" | "mobile" | "admin";
  title: string;
  url: string | null;
  className?: string;
  fill?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onMinimize?: () => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [pinMode, setPinMode] = useState(false);
  const { anchoredComments, draftNotes, addDraftAnchor } = useReviewContext();
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const spec = PREVIEW_SPECS[kind];
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [bridgeViewport, setBridgeViewport] = useState<ReviewBridgeViewport | null>(null);
  const frameClass =
    fill
      ? "min-h-0 flex-1"
      : kind === "mobile"
      ? "min-h-[520px] aspect-[9/16] xl:min-h-[380px] 2xl:min-h-[520px]"
      : "min-h-[380px] aspect-[16/10]";

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;

    const updateSize = (width: number, height: number) => {
      setStageSize((current) =>
        Math.abs(current.width - width) < 0.5 &&
        Math.abs(current.height - height) < 0.5
          ? current
          : { width, height },
      );
    };

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      updateSize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(stage);
    updateSize(stage.clientWidth, stage.clientHeight);
    return () => observer.disconnect();
  }, [kind]);

  useEffect(() => {
    setBridgeViewport(null);
    if (!url) return;
    let iframeOrigin: string;
    try {
      iframeOrigin = new URL(url).origin;
    } catch {
      return;
    }
    const receive = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.origin !== iframeOrigin) return;
      const next = parseReviewBridgeViewport(event.data);
      if (next) setBridgeViewport(next);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [refreshKey, url]);

  const stagePadding = kind === "mobile" ? 20 : 12;
  const previewScale =
    stageSize.width > 0 && stageSize.height > 0
      ? Math.min(
          Math.max(1, stageSize.width - stagePadding * 2) / spec.frameWidth,
          Math.max(1, stageSize.height - stagePadding * 2) / spec.frameHeight,
          1,
        )
      : 1;
  const scaledHeight = spec.frameHeight * previewScale;
  const previewTop = Math.max(
    stagePadding,
    (stageSize.height - scaledHeight) / 2,
  );
  const scaleLabel = stageSize.width > 0 ? `${Math.round(previewScale * 100)}%` : "…";
  const markers = anchoredComments.filter(
    (comment) => comment.anchor.viewport === kind && comment.anchor.url === url,
  );
  const pendingMarkers = draftNotes.filter(
    (note) => note.anchor.viewport === kind && note.anchor.url === url,
  );

  function placeAnchor(event: React.MouseEvent<HTMLDivElement>) {
    if (!url) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    addDraftAnchor({
      viewport: kind,
      x: Math.round(x * 10_000) / 10_000,
      y: Math.round(y * 10_000) / 10_000,
      url,
      label: `${title} · ${Math.round(x * 100)}%, ${Math.round(y * 100)}%`,
      ...documentPointForAnchor(x, y, bridgeViewport),
    });
    setPinMode(false);
  }

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white",
        fill && "flex h-full flex-col",
        className,
      )}
    >
      <header
        className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-3"
        onDoubleClick={onFocus}
        title={onFocus ? (focused ? "Doble clic para restaurar" : "Doble clic para ampliar") : undefined}
      >
        <div className="flex items-center gap-2">
          {kind === "admin" ? <IconShield size={12} /> : <IconLayout size={12} />}
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            {title}
          </span>
          <span className="hidden font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)] sm:inline">
            {spec.label} · {scaleLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {url ? (
            <>
            <button
              type="button"
              onClick={() => setPinMode((value) => !value)}
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-md border px-2 font-mono text-[8px] uppercase tracking-[0.08em]",
                pinMode ? "border-black bg-black text-white" : "border-[var(--border-1)] hover:border-black",
              )}
              aria-pressed={pinMode}
              aria-label={`Anclar comentario en ${title}`}
              title={bridgeViewport ? "Anclaje preciso activo: la marca seguirá al contenido" : "Marca varios puntos y escribe sus notas en la bandeja"}
            >
              <IconMap size={10} /> <span className="hidden xl:inline">Anclar</span>
            </button>
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
          {onMinimize ? <MinimizeButton onClick={onMinimize} label={title} /> : null}
          {onFocus ? <FocusButton focused={focused} onClick={onFocus} label={title} /> : null}
        </div>
      </header>

      {url ? (
        <div
          ref={stageRef}
          className={cn("relative w-full overflow-hidden bg-[var(--color-surface)]", frameClass)}
          onDoubleClick={(event) => {
            if (event.target === event.currentTarget) onFocus?.();
          }}
        >
          <div
            className={cn(
              "absolute left-1/2 overflow-hidden bg-white opacity-0 transition-opacity duration-150",
              stageSize.width > 0 && "opacity-100",
              kind === "mobile"
                ? "rounded-[30px] border-[6px] border-black shadow-lg"
                : "border border-[var(--border-1)] shadow-lg",
            )}
            style={{
              top: previewTop,
              width: spec.frameWidth,
              height: spec.frameHeight,
              transform: `translateX(-50%) scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            {kind === "mobile" ? (
              <>
                <div className="absolute left-1/2 top-[9px] z-10 h-[6px] w-[72px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
                <iframe
                  ref={iframeRef}
                  key={refreshKey}
                  src={url}
                  title={"Vista móvil real de " + title}
                  className="absolute left-[6px] top-[28px] border-0 bg-white"
                  style={{ width: spec.width, height: spec.height }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </>
            ) : (
              <iframe
                ref={iframeRef}
                key={refreshKey}
                src={url}
                title={`Vista ${kind === "admin" ? "administrativa" : "de escritorio"} de ${title}`}
                className="absolute inset-0 border-0 bg-white"
                style={{ width: spec.width, height: spec.height }}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}
            <div
              className={cn(
                "absolute z-20",
                kind === "mobile" ? "left-[6px] top-[28px]" : "inset-0",
                pinMode ? "cursor-crosshair bg-black/5" : "pointer-events-none",
              )}
              style={{ width: spec.width, height: spec.height }}
              onClick={placeAnchor}
              aria-label={pinMode ? `Selecciona un punto en ${title}` : undefined}
            >
              {markers.map((comment, index) => (
                <ReviewMarker
                  key={comment.id}
                  anchor={comment.anchor}
                  bridge={bridgeViewport}
                  href={`#comment-${comment.id}`}
                  label={`${index + 1}`}
                  ariaLabel={`Ver comentario ${index + 1}: ${comment.anchor.label}`}
                  saved
                />
              ))}
              {pendingMarkers.map((note) => (
                <ReviewMarker
                  key={note.id}
                  anchor={note.anchor}
                  bridge={bridgeViewport}
                  label={`${draftNotes.indexOf(note) + 1}`}
                  ariaLabel={`Ancla pendiente ${draftNotes.indexOf(note) + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("grid w-full place-items-center bg-white p-6 text-center", frameClass)}>
          <div>
            <p className="text-[12px] font-medium text-black">
              Sin URL para {title.toLowerCase()}
            </p>
            <p className="mt-2 max-w-xs text-[10px] leading-4 text-[var(--fg-muted)]">
              {kind === "admin"
                ? "Configura la URL del panel administrativo del proyecto. La vista pública no se usará como sustituto."
                : "Esta vista aparecerá cuando el proyecto tenga una URL autorizada."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewMarker({
  anchor,
  bridge,
  label,
  ariaLabel,
  href,
  saved = false,
}: {
  anchor: ReviewAnchor;
  bridge: ReviewBridgeViewport | null;
  label: string;
  ariaLabel: string;
  href?: string;
  saved?: boolean;
}) {
  const position = anchorViewportPosition(anchor, bridge);
  if (!position.visible) return null;
  const className = cn(
    "absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 font-mono text-[10px] shadow-lg",
    saved
      ? "pointer-events-auto border-white bg-black text-white"
      : "border-black bg-white text-black",
  );
  const style = { left: `${position.x * 100}%`, top: `${position.y * 100}%` };
  return href ? (
    <a href={href} className={className} style={style} aria-label={ariaLabel} title={anchor.label}>
      {label}
    </a>
  ) : (
    <span className={className} style={style} aria-label={ariaLabel} title={anchor.label}>
      {label}
    </span>
  );
}

function ActivityFeed({
  projectId,
  rail = false,
  workspace = false,
  focused = false,
  onFocus,
  onMinimize,
}: {
  projectId: string;
  rail?: boolean;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onMinimize?: () => void;
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
      <div className={cn("flex items-center justify-between gap-3", workspace && "-mx-4 -mt-4 h-10 shrink-0 border-b border-[var(--border-1)] px-4")}>
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
          {onMinimize ? <MinimizeButton onClick={onMinimize} label="actividad" /> : null}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MessageSquare,
  FolderKanban,
  Lock,
  Boxes,
  Activity,
  Settings,
  Plus,
  GitBranch,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Tab = "sessions" | "projects" | "tools";

interface Project {
  id: string;
  name: string;
  github_repo: string | null;
  category: string;
}

interface SidebarV3Props {
  onItemClick?: () => void;
}

const NAV_LINKS = [
  { name: "Chat con V", href: "/hub", icon: MessageSquare },
  { name: "Proyectos", href: "/projects", icon: FolderKanban },
  { name: "Bóveda", href: "/vault", icon: Lock },
  { name: "Módulos", href: "/modules", icon: Boxes },
  { name: "Actividad", href: "/activity", icon: Activity },
];

export function SidebarV3({ onItemClick }: SidebarV3Props) {
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("sessions");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Lazy-load projects when the Projects tab is selected.
  useEffect(() => {
    if (tab !== "projects" || projects.length > 0) return;
    let aborted = false;
    setProjectsLoading(true);
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((data: { projects: Project[] }) => {
        if (!aborted) setProjects(data.projects ?? []);
      })
      .catch(() => {
        if (!aborted) setProjects([]);
      })
      .finally(() => {
        if (!aborted) setProjectsLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [tab, projects.length]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Primary nav */}
      <nav className="px-2 pt-3 pb-2 space-y-0.5 flex-shrink-0">
        {NAV_LINKS.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname?.startsWith(`${item.href}/`) ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-vf-bg-1 text-vf-fg"
                  : "text-vf-fg-1 hover:bg-vf-bg-1 hover:text-vf-fg",
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Tabs divider */}
      <div className="border-t border-vf-border mt-2 mx-3" />

      {/* Tabs */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1">
          <TabButton
            active={tab === "sessions"}
            onClick={() => setTab("sessions")}
            label="Sesiones"
          />
          <TabButton
            active={tab === "projects"}
            onClick={() => setTab("projects")}
            label="Proyectos"
          />
        </div>
        {tab === "projects" && (
          <Link
            href="/projects"
            onClick={onItemClick}
            aria-label="Dar de alta proyecto"
            className="w-7 h-7 flex items-center justify-center rounded-md text-vf-fg-1 hover:text-vf-fg hover:bg-vf-bg-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Tab content (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {tab === "sessions" && <SessionsList onItemClick={onItemClick} />}
        {tab === "projects" && (
          <ProjectsList
            projects={projects}
            loading={projectsLoading}
            onItemClick={onItemClick}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-vf-border p-2 flex-shrink-0 space-y-0.5">
        <Link
          href="/settings"
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
            pathname === "/settings"
              ? "bg-vf-bg-1 text-vf-fg"
              : "text-vf-fg-1 hover:bg-vf-bg-1 hover:text-vf-fg",
          )}
        >
          <Settings className="w-4 h-4" strokeWidth={1.75} />
          <span>Configuración</span>
        </Link>
        <ThemeToggle variant="row" />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-vf-bg-1 text-vf-fg"
          : "text-vf-fg-2 hover:text-vf-fg-1 hover:bg-vf-bg-1/60",
      )}
    >
      {label}
    </button>
  );
}

function SessionsList({ onItemClick }: { onItemClick?: () => void }) {
  // TODO M-next: cargar lista de sesiones reales agrupadas por session_id
  // desde /api/forge/conversations (necesita endpoint que liste sesiones, no
  // turns). Por ahora muestra placeholder elegante.
  return (
    <div className="space-y-1.5 pt-1">
      <Link
        href="/hub"
        onClick={onItemClick}
        className="block rounded-md p-2.5 hover:bg-vf-bg-1 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse flex-shrink-0" />
          <span className="text-xs font-medium text-vf-fg truncate">
            Sesión actual
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-vf-fg-2 font-mono">
          <Clock className="w-2.5 h-2.5" />
          en vivo
        </div>
      </Link>
      <div className="px-2 pt-3 text-[10px] text-vf-fg-3 leading-snug">
        Las sesiones anteriores de V se listarán aquí. V conserva su memoria
        completa — esta lista es solo para volver a abrirlas.
      </div>
    </div>
  );
}

function ProjectsList({
  projects,
  loading,
  onItemClick,
}: {
  projects: Project[];
  loading: boolean;
  onItemClick?: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-1.5 pt-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[52px] rounded-md bg-vf-bg-1/40 animate-pulse"
          />
        ))}
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <div className="pt-2 px-2 space-y-3">
        <p className="text-xs text-vf-fg-2 leading-relaxed">
          Aún no hay proyectos.
        </p>
        <Link
          href="/projects"
          onClick={onItemClick}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-vf-green text-black text-xs font-semibold hover:bg-vf-green/90 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Dar de alta
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-0.5 pt-1">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/projects/${p.id}`}
          onClick={onItemClick}
          className="block rounded-md p-2.5 hover:bg-vf-bg-1 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                p.category === "produccion"
                  ? "bg-vf-green"
                  : p.category === "activo"
                    ? "bg-blue-400"
                    : "bg-vf-fg-2",
              )}
            />
            <span className="text-xs font-medium text-vf-fg-1 group-hover:text-vf-fg truncate">
              {p.name}
            </span>
          </div>
          {p.github_repo && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-vf-fg-2 font-mono truncate">
              <GitBranch className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{p.github_repo}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ProjectSwitcherProps {
  className?: string;
}

interface Project {
  id: string;
  name: string;
  category: string;
  github_repo: string | null;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects: Project[] }) => {
        setProjects(d.projects);
        if (d.projects.length > 0) setSelectedId(d.projects[0].id);
      })
      .catch(() => undefined);
  }, []);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md",
            "bg-vf-bg-1 border border-vf-border",
            "hover:bg-vf-bg-2 transition-colors duration-150",
            "min-h-[36px]",
            className,
          )}
        >
          <span className="font-mono text-[11px] text-vf-fg-2 px-1.5 py-0.5 rounded bg-vf-bg-2 border border-vf-border-1">
            {selected ? selected.id.slice(0, 2).toUpperCase() : "—"}
          </span>
          <span className="text-sm text-vf-fg hidden sm:inline max-w-[120px] truncate">
            {selected?.name ?? "Sin proyectos"}
          </span>
          <ChevronDown className="w-3 h-3 text-vf-fg-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-vf-bg-1 border-vf-border"
      >
        {projects.length === 0 ? (
          <DropdownMenuItem asChild>
            <Link
              href="/projects"
              className="flex items-center gap-3 px-3 py-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-vf-green" />
              <div className="text-sm text-vf-fg">Dar de alta el primero</div>
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            {projects.map((project) => (
              <DropdownMenuItem key={project.id} asChild>
                <Link
                  href={`/projects/${project.id}`}
                  onClick={() => setSelectedId(project.id)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                >
                  <span className="font-mono text-[10px] text-vf-fg-2 px-1.5 py-0.5 rounded bg-vf-bg-2 flex-shrink-0">
                    {project.id.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-vf-fg truncate">
                      {project.name}
                    </div>
                    <div className="text-xs text-vf-fg-2 font-mono truncate">
                      {project.github_repo ?? "(sin repo)"}
                    </div>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/projects"
                className="flex items-center gap-3 px-3 py-2 cursor-pointer text-vf-green-quiet"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="text-sm">Dar de alta otro</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

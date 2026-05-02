"use client";

import { cn } from "@/lib/utils";
import type { Project } from "@/lib/mock-data";
import { ProjectFavicon } from "./project-favicon";
import { StatusPill } from "./status-pill";
import { useRouter } from "next/navigation";

interface ProjectRowProps {
  project: Project;
  className?: string;
  delay?: number;
  showBorder?: boolean;
}

export function ProjectRow({ project, className, delay = 0, showBorder = false }: ProjectRowProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/projects/${project.slug}`)}
      className={cn(
        "flex items-center gap-3 px-4 py-4 w-full text-left",
        "hover:bg-vf-bg-1 active:bg-vf-bg-1 transition-colors duration-150",
        "stagger-fade-up",
        showBorder && "border-t border-vf-border",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <ProjectFavicon project={project} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-vf-fg truncate">
          {project.name}
        </div>
        <div className="font-mono text-xs text-vf-fg-2 truncate">
          {project.repo}
        </div>
      </div>
      <StatusPill status={project.status} />
    </button>
  );
}

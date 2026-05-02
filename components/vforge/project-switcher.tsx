"use client";

import { cn } from "@/lib/utils";
import { PROJECTS } from "@/lib/mock-data";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectFavicon } from "./project-favicon";
import { useState } from "react";
import Link from "next/link";

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const [selectedProject] = useState(PROJECTS[0]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md",
            "bg-vf-bg-1 border border-vf-border",
            "hover:bg-vf-bg-2 transition-colors duration-150",
            "min-h-[36px]",
            className
          )}
        >
          <ProjectFavicon project={selectedProject} size="sm" />
          <span className="text-sm text-vf-fg hidden sm:inline max-w-[100px] truncate">
            {selectedProject.name}
          </span>
          <ChevronDown className="w-3 h-3 text-vf-fg-2" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-vf-bg-1 border-vf-border"
      >
        {PROJECTS.map((project) => (
          <DropdownMenuItem key={project.id} asChild>
            <Link
              href={`/projects/${project.slug}`}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer"
            >
              <ProjectFavicon project={project} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-vf-fg truncate">{project.name}</div>
                <div className="text-xs text-vf-fg-2 font-mono truncate">
                  {project.repo}
                </div>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { cn } from "@/lib/utils";
import type { Project } from "@/lib/mock-data";

interface ProjectFaviconProps {
  project: Project;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-[10px]",
  md: "w-9 h-9 text-[11px]",
  lg: "w-12 h-12 text-sm",
  xl: "w-14 h-14 text-base",
};

export function ProjectFavicon({
  project,
  size = "md",
  className,
}: ProjectFaviconProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gradient-to-br flex items-center justify-center font-mono font-medium text-white",
        project.favicon.gradient,
        sizeClasses[size],
        className
      )}
      style={{
        boxShadow: `0 0 12px ${project.favicon.color}20`,
      }}
    >
      {project.favicon.initials}
    </div>
  );
}

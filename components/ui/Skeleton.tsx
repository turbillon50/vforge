"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton elegante con shimmer. Reemplaza pantallas en blanco mientras
 * carga el contenido real. Mobile-first, dark/light via tokens.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("vf-skeleton rounded-xl", className)} aria-hidden />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "surface-deep flex shrink-0 flex-col justify-between rounded-2xl border border-app p-4",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="h-5 w-5 rounded-md" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

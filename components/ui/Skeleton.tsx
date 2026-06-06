import { cn } from "@/lib/utils";

/**
 * Skeleton elegante con shimmer. Reemplaza pantallas en blanco mientras
 * carga el contenido real (manifiesto B4, anti layout-shift B1).
 * Mobile-first, dark/light via tokens.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("vf-skeleton rounded-xl", className)} aria-hidden />;
}

/** Card de skeleton para tiles horizontales (home, carruseles). */
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

/** Fila de skeleton típica: punto + texto (servicios en vivo). */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 py-2", className)}>
      <Skeleton className="h-2 w-2 flex-none rounded-full" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="ml-auto h-3 w-10" />
    </div>
  );
}

/** Card de skeleton para grids (cartera, proyectos). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-app bg-tint-1 p-4", className)} aria-hidden>
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
      <Skeleton className="mt-4 h-3 w-3/4" />
    </div>
  );
}

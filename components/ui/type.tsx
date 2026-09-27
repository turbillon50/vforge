import { cn } from "@/lib/utils";

/** Escala de producto. No usar px sueltos en chrome. */
export const typeScale = {
  eyebrow: "font-mono text-label-caps uppercase",
  title: "truncate text-body-md font-medium tracking-[-0.02em]",
  nav: "block text-body-sm font-medium",
  meta: "mt-0.5 block truncate text-caption",
  body: "text-body-sm",
  quiet: "text-caption text-[var(--fg-muted)]",
} as const;

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn(typeScale.eyebrow, className)}>{children}</p>;
}

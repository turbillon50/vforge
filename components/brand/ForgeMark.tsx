import { cn } from "@/lib/utils";

/* Logo aprobado VForge (Luis, 2026-10-02): triángulo invertido relleno + FORGE
   en mayúsculas, peso ligero y tracking amplio. NO inventar variantes.
   Fuente del triángulo: components/marketing/MonochromeHome.tsx (ForgeMark). */

export function ForgeMark({
  size = 19,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 14"
      width={size}
      height={(size * 14) / 16}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d="M0 0h16L8 14z" fill="currentColor" />
    </svg>
  );
}

export function ForgeWordmark({
  className,
  size = 19,
  tracking = "0.24em",
}: {
  className?: string;
  size?: number;
  tracking?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-3 whitespace-nowrap", className)}
      style={{ letterSpacing: tracking }}
    >
      <ForgeMark size={size} />
      <span
        className="font-light uppercase leading-none"
        style={{ letterSpacing: tracking }}
      >
        Forge
      </span>
    </span>
  );
}

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  glow?: boolean;
};

/* Marca monocromática: hereda el color del contexto y funciona en claro/oscuro. */
export function VMark({ className, size = 28, glow = false }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={cn(glow && "drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]", className)}
    >
      <path
        d="M8 8 L32 56 L56 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <VMark size={22} />
      <span className="font-display text-[18px] font-semibold tracking-[-0.035em]">
        VForge
      </span>
    </div>
  );
}

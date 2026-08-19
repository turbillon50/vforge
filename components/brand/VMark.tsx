import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  glow?: boolean;
};

/* V metálica cromada — sin morado, sin cyan */
export function VMark({ className, size = 28, glow = false }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={cn(glow && "drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]", className)}
    >
      <defs>
        <linearGradient id="v-metal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="30%"  stopColor="#c8c8d8" />
          <stop offset="65%"  stopColor="#888898" />
          <stop offset="100%" stopColor="#e4e4f0" />
        </linearGradient>
      </defs>
      <path
        d="M6 6 L32 58 L58 6"
        fill="none"
        stroke="url(#v-metal)"
        strokeWidth="7"
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
      <span
        className="font-display text-[18px] font-semibold tracking-tight"
        style={{ color: "#fff" }}
      >
        VForge
      </span>
    </div>
  );
}

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  glow?: boolean;
};

export function VMark({ className, size = 28, glow = true }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={cn(glow && "drop-shadow-[0_0_18px_rgba(139,92,246,0.55)]", className)}
    >
      <defs>
        <linearGradient id="v-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="55%" stopColor="#a078ff" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M6 6 L32 58 L58 6"
        fill="none"
        stroke="url(#v-grad)"
        strokeWidth="6"
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
      <span className="font-display text-[18px] font-semibold tracking-tight text-on-surface">
        VForge
      </span>
    </div>
  );
}

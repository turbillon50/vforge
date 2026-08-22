import { cn } from "@/lib/utils";

type MarkProps = {
  className?: string;
  size?: number;
  glow?: boolean;
};

export function VMark({ className, size = 28 }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path
        d="M7 8 32 56 57 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function VWordmark({
  className,
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 whitespace-nowrap",
        inverse ? "text-white" : "text-black",
        className,
      )}
    >
      <VMark size={22} />
      <span className="font-display text-[17px] font-semibold tracking-[-0.035em]">
        VForge
      </span>
    </span>
  );
}

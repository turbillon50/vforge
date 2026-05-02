"use client";
import { cn } from "@/lib/utils";

type BrandSize = "sm" | "md" | "lg" | "xl";

const FONT_PX: Record<BrandSize, number> = {
  sm: 18,
  md: 24,
  lg: 44,
  xl: 76,
};

export function Brand({
  size = "md",
  showTagline = false,
  showReflection = false,
  className,
}: {
  size?: BrandSize;
  showTagline?: boolean;
  showReflection?: boolean;
  className?: string;
}) {
  const px = FONT_PX[size];
  const showTag = showTagline || size === "lg" || size === "xl";
  const showRef = showReflection && size === "xl";

  return (
    <div
      className={cn("brand-root inline-flex flex-col items-center", className)}
    >
      <div
        className="brand-wordmark"
        style={{ fontSize: px }}
        aria-label="vForge"
      >
        <span className="brand-v" aria-hidden>
          V
        </span>
        <span className="brand-forge" aria-hidden>
          <span className="brand-letter">F</span>
          <span className="brand-ring" aria-hidden />
          <span className="brand-letter">r</span>
          <span className="brand-letter">g</span>
          <span className="brand-letter">e</span>
        </span>
      </div>

      {showTag && (
        <div className="brand-tagline">
          <span className="brand-line" />
          <span className="brand-tagline-text">BUILD. DEPLOY. EVOLVE.</span>
          <span className="brand-line" />
        </div>
      )}

      {showRef && (
        <div
          aria-hidden
          className="brand-reflection"
          style={{ fontSize: px }}
        >
          <span className="brand-v">V</span>
          <span className="brand-forge">
            <span className="brand-letter">F</span>
            <span className="brand-ring" />
            <span className="brand-letter">r</span>
            <span className="brand-letter">g</span>
            <span className="brand-letter">e</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* Demo export for preview */
export function BrandDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-screen">
      <div className="bg-vf-bg p-12 flex flex-col items-center justify-center gap-12">
        <p className="text-vf-fg-2 font-mono text-xs uppercase tracking-wider">
          Dark Theme
        </p>
        <Brand size="sm" />
        <Brand size="md" />
        <Brand size="lg" showTagline />
        <Brand size="xl" showTagline showReflection />
      </div>

      <div
        data-theme="light"
        className="bg-white p-12 flex flex-col items-center justify-center gap-12"
      >
        <p className="text-vf-fg-2 font-mono text-xs uppercase tracking-wider">
          Light Theme
        </p>
        <Brand size="sm" />
        <Brand size="md" />
        <Brand size="lg" showTagline />
        <Brand size="xl" showTagline showReflection />
      </div>
    </div>
  );
}

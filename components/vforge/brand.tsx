"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";

type BrandSize = "sm" | "md" | "lg" | "xl";

// Heights for each size - sm/md are compact for topbar, lg/xl for splash
const SIZE_CONFIG: Record<BrandSize, { height: number; width: number }> = {
  sm: { height: 20, width: 80 },
  md: { height: 26, width: 104 },
  lg: { height: 48, width: 192 },
  xl: { height: 80, width: 320 },
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
  const { height, width } = SIZE_CONFIG[size];
  const showTag = showTagline || size === "lg" || size === "xl";
  const showRef = showReflection && size === "xl";

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <Image
        src="/images/vforge-logo.jpeg"
        alt="vForge"
        width={width}
        height={height}
        className="object-contain"
        priority={size === "sm" || size === "md"}
      />
      
      {showRef && (
        <div
          aria-hidden
          className="mt-1 opacity-[0.18] blur-[0.5px]"
          style={{
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%)",
            WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%)",
          }}
        >
          <Image
            src="/images/vforge-logo.jpeg"
            alt=""
            width={width}
            height={height}
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}

/* Demo export for preview */
export function BrandDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-screen">
      {/* Dark theme column */}
      <div className="bg-vf-bg p-12 flex flex-col items-center justify-center gap-12">
        <p className="text-vf-fg-2 font-mono text-xs uppercase tracking-wider">Dark Theme</p>
        <Brand size="sm" />
        <Brand size="md" />
        <Brand size="lg" />
        <Brand size="xl" showReflection />
      </div>
      
      {/* Light theme column */}
      <div data-theme="light" className="bg-white p-12 flex flex-col items-center justify-center gap-12">
        <p className="text-vf-fg-2 font-mono text-xs uppercase tracking-wider">Light Theme</p>
        <Brand size="sm" />
        <Brand size="md" />
        <Brand size="lg" />
        <Brand size="xl" showReflection />
      </div>
    </div>
  );
}

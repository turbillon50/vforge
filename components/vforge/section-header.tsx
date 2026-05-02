"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  rightCta?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function SectionHeader({ title, rightCta, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h2 className="text-[13px] uppercase tracking-wide text-vf-fg-2 font-medium">
        {title}
      </h2>
      {rightCta && (
        <Link
          href={rightCta.href}
          className="text-sm text-vf-green hover:underline underline-offset-4"
        >
          {rightCta.label}
        </Link>
      )}
    </div>
  );
}

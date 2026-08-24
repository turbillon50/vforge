"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";
import { VMark } from "@/components/brand/VMark";
import { Markdown } from "@/components/workspace/chat/Markdown";
import {
  IconBrain,
  IconCheck,
  IconChevD,
  IconClip,
  IconExtLink,
  IconGithub,
  IconGlobe,
  IconLayout,
  IconLoader,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconSend,
  IconShield,
  IconWifi,
  IconX,
} from "@/components/brand/VFIcons";

// TEMP RESTORE MARKER — full file will be restored in next push from main content.
// This placeholder prevents broken build while we redesign the guided flow.
export function ForgeStudio() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[var(--vf-bg)] text-[var(--vf-fg)] p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--vf-fg-2)]">Restaurando estudio</p>
      <p className="mt-3 text-[13px]">El estudio canónico se está recuperando. Vuelve en un momento.</p>
    </div>
  );
}

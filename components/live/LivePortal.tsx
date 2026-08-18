"use client";
/**
 * Portal en vivo del proyecto — 3 viewports simultáneos (desktop / mobile /
 * admin) + actividad en vivo + comentarios, con el look VForge.
 *
 * El viewport ADMIN solo se muestra a reviewer/owner. La actividad hace
 * short-polling seguro a /api/live/[id]/events (aislado por proyecto). Sin
 * dependencias extra (fetch + hooks nativos).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  IconGlobe,
  IconLayout,
  IconShield,
  IconChat,
  IconActivity,
  IconSend,
  IconLoader,
  IconExtLink,
  IconCheck,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { InvitePanel } from "@/components/live/InvitePanel";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface LivePortalProject {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
}
export interface LivePortalMe {
  name: string;
  role: LiveRole;
  isPlatformOwner: boolean;
}
interface EventRow {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  severity: string;
  ts: string;
}
interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

const SEV_COLOR: Record<string, string> = {
  low: "#64748b",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Owner",
  reviewer: "Revisor",
  observer: "Observador",
};

export function LivePortal({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const isOwner = me.role === "owner";

  return (
    <div className="min-h-screen bg-[#03020a] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {project.name}
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Portal en vivo · {me.name}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-200">
            {ROLE_LABEL[me.role]}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[
"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  PenLine,
  Search,
  Terminal,
  Globe,
  Database,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export interface TraceEntry {
  id: string;
  tool: string;
  status: "running" | "ok" | "error";
  summary?: string;
}

const TOOL_ICON: Record<string, typeof Wrench> = {
  github_read_file: BookOpen,
  github_get_repo: BookOpen,
  github_list_repos: Search,
  github_write_file: PenLine,
  github_create_file: PenLine,
  memory_save: Database,
  memory_search: Search,
  vault_get: Database,
  vault_set: Database,
  vercel_get_project: Globe,
  vercel_create_project: Globe,
  vercel_trigger_deployment: Globe,
  vercel_add_domain: Globe,
  namecom_list_records: Globe,
  namecom_upsert_record: Globe,
  remote_execution: Terminal,
  browser_control: Globe,
  image_generation: Wrench,
  ssh_command_executor: Terminal,
};

const TOOL_VERB: Record<string, string> = {
  github_read_file: "Reading",
  github_get_repo: "Inspecting",
  github_list_repos: "Listing repos",
  github_write_file: "Writing",
  github_create_file: "Creating",
  memory_save: "Saving memory",
  memory_search: "Recalling",
  vault_get: "Reading vault",
  vault_set: "Writing vault",
  vercel_get_project: "Inspecting Vercel",
  vercel_create_project: "Creating Vercel project",
  vercel_trigger_deployment: "Deploying",
  vercel_add_domain: "Adding domain",
  namecom_list_records: "Listing DNS",
  namecom_upsert_record: "Updating DNS",
  remote_execution: "Executing remote",
  browser_control: "Browsing",
  image_generation: "Generating image",
  ssh_command_executor: "Running SSH",
};

function verbFor(tool: string): string {
  return TOOL_VERB[tool] ?? `Running ${tool.replace(/_/g, " ")}`;
}

function IconFor({ tool, status }: { tool: string; status: TraceEntry["status"] }) {
  if (status === "ok")
    return <CheckCircle2 size={11} className="text-success-emerald/70" aria-hidden />;
  if (status === "error")
    return <XCircle size={11} className="text-error-crimson/80" aria-hidden />;
  const Cmp = TOOL_ICON[tool] ?? Wrench;
  return <Cmp size={11} className="text-on-surface-variant/70" aria-hidden />;
}

export function ProcessTrace({ entry }: { entry: TraceEntry }) {
  const muted = entry.status === "error" ? "text-error-crimson/80" : "text-on-surface-variant/70";
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2 py-0.5 font-mono text-[11px] leading-relaxed ${muted}`}
    >
      <IconFor tool={entry.tool} status={entry.status} />
      <span className="truncate">
        <span className="text-on-surface-variant/80">{verbFor(entry.tool)}</span>
        {entry.summary && <span className="text-muted"> · {entry.summary}</span>}
      </span>
      {entry.status === "running" && (
        <motion.span
          aria-hidden
          className="inline-block h-1 w-1 rounded-full bg-violet-300/80"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}

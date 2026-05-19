'use client';

import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TraceEntry {
  id: string;
  tool: string;
  status: 'running' | 'ok' | 'error';
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
  github_read_file: 'Reading',
  github_get_repo: 'Inspecting',
  github_list_repos: 'Listing repos',
  github_write_file: 'Writing',
  github_create_file: 'Creating',
  memory_save: 'Saving memory',
  memory_search: 'Recalling',
  vault_get: 'Reading vault',
  vault_set: 'Writing vault',
  vercel_get_project: 'Inspecting Vercel',
  vercel_create_project: 'Creating Vercel project',
  vercel_trigger_deployment: 'Deploying',
  vercel_add_domain: 'Adding domain',
  namecom_list_records: 'Listing DNS',
  namecom_upsert_record: 'Updating DNS',
  remote_execution: 'Executing remote',
  browser_control: 'Browsing',
  image_generation: 'Generating image',
  ssh_command_executor: 'Running SSH',
};

function verbFor(tool: string): string {
  return TOOL_VERB[tool] ?? `Running ${tool.replace(/_/g, ' ')}`;
}

function IconFor({ tool, status }: { tool: string; status: TraceEntry['status'] }) {
  if (status === 'ok') return <CheckCircle2 size={11} className="text-vf-green/60" aria-hidden />;
  if (status === 'error') return <XCircle size={11} className="text-vf-error/80" aria-hidden />;
  const Cmp = TOOL_ICON[tool] ?? Wrench;
  return <Cmp size={11} className="text-vf-fg-3" aria-hidden />;
}

interface ProcessTraceProps {
  entry: TraceEntry;
}

export function ProcessTrace({ entry }: ProcessTraceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex items-center gap-2 pl-11 pr-3 py-0.5',
        'text-[11px] leading-relaxed font-mono',
        entry.status === 'error' ? 'text-vf-error/80' : 'text-vf-fg-3/80',
      )}
    >
      <IconFor tool={entry.tool} status={entry.status} />
      <span className="truncate">
        <span className="text-vf-fg-2/70">{verbFor(entry.tool)}</span>
        {entry.summary ? (
          <span className="text-vf-fg-3/60"> · {entry.summary}</span>
        ) : null}
      </span>
      {entry.status === 'running' && <RunningPulse />}
    </motion.div>
  );
}

function RunningPulse() {
  return (
    <motion.span
      aria-hidden
      className="inline-block w-1 h-1 rounded-full bg-vf-green/70"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

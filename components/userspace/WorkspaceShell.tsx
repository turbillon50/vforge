"use client";

/**
 * Layout cliente del workspace: split en desktop, tabs en móvil.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Workflow } from "lucide-react";
import AssistantChat from "@/components/userspace/AssistantChat";
import BlueprintCanvas from "@/components/userspace/BlueprintCanvas";
import IntegrationPlan from "@/components/userspace/IntegrationPlan";
import type { WorkspaceScope } from "@/lib/workspace/db";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function WorkspaceShell({ scope }: { scope: WorkspaceScope }) {
  const [tab, setTab] = useState<"chat" | "blueprint">("chat");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Tabs solo en móvil */}
      <div className="flex gap-2 px-4 pb-3 lg:hidden">
        <TabButton
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          icon={<MessageSquare className="h-4 w-4" aria-hidden />}
          label="Chat"
        />
        <TabButton
          active={tab === "blueprint"}
          onClick={() => setTab("blueprint")}
          icon={<Workflow className="h-4 w-4" aria-hidden />}
          label="Blueprint"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[minmax(360px,2fr)_3fr] lg:px-6 lg:pb-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className={`min-h-0 overflow-hidden rounded-3xl border border-app bg-surface shadow-elev ${
            tab === "chat" ? "flex" : "hidden"
          } flex-col lg:flex`}
        >
          <AssistantChat />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.08 }}
          className={`relative min-h-0 overflow-hidden rounded-3xl border border-app bg-surface shadow-elev ${
            tab === "blueprint" ? "block" : "hidden"
          } lg:block`}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />
          <BlueprintCanvas scope={scope} />
        </motion.section>
      </div>

      <div className="px-4 pb-6 lg:px-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.12 }}
          className="overflow-hidden rounded-3xl border border-app bg-surface shadow-elev"
        >
          <IntegrationPlan />
        </motion.section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full border text-sm font-medium transition ${
        active
          ? "border-violet-500/50 bg-violet-500/10 text-on-surface"
          : "border-app bg-tint-1 text-on-surface-variant hover:bg-tint-2"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

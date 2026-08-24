"use client";

import { ForgeStudio } from "@/components/studio/ForgeStudio";
import { PendingTaskRunner } from "@/components/studio/PendingTaskRunner";
import { TaskQueuePanel } from "@/components/live/TaskQueuePanel";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PendingTaskRunner />
      <div className="shrink-0 border-b border-[var(--border-1)] bg-white px-3 py-2">
        <TaskQueuePanel compact />
      </div>
      <div className="min-h-0 flex-1">
        <ForgeStudio />
      </div>
    </div>
  );
}

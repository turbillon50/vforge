"use client";

import { ForgeStudio } from "@/components/studio/ForgeStudio";
import { PendingTaskRunner } from "@/components/studio/PendingTaskRunner";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
      <PendingTaskRunner />
      <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden">
        <ForgeStudio />
      </div>
    </div>
  );
}

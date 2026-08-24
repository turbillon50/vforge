"use client";

import { ForgeStudio } from "@/components/studio/ForgeStudio";
import { PendingTaskRunner } from "@/components/studio/PendingTaskRunner";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PendingTaskRunner />
      <div className="min-h-0 flex-1">
        <ForgeStudio />
      </div>
    </div>
  );
}

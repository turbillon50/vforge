"use client";

import { cn } from "@/lib/utils";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MessageRole = "user" | "forge";

export interface StepItem {
  text: string;
  status: "done" | "pending" | "loading";
}

export interface ChatMessageData {
  id: string;
  role: MessageRole;
  content: string;
  steps?: StepItem[];
  actions?: { label: string; variant: "primary" | "ghost" }[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  onAction?: (action: string) => void;
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-vf-bg-3 rounded-lg px-4 py-3 max-w-[80%]">
          <p className="text-sm text-vf-fg">{message.content}</p>
        </div>
      </div>
    );
  }

  // Forge message
  return (
    <div className="flex justify-start">
      <div className="border-l-2 border-vf-green pl-4 max-w-[90%]">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-vf-green">
            FORGE
          </span>
          <ForgeOrb size={14} state="idle" glow={false} className="inline-block align-[-2px]" />
        </div>

        {/* Content */}
        <div className="text-sm text-vf-fg space-y-3">
          <p>{message.content}</p>

          {/* Steps list */}
          {message.steps && message.steps.length > 0 && (
            <ul className="space-y-2">
              {message.steps.map((step, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {step.status === "done" && (
                    <Check className="w-4 h-4 text-vf-green flex-shrink-0" />
                  )}
                  {step.status === "loading" && (
                    <ForgeOrb size={20} state="loading" glow={false} className="flex-shrink-0 mr-0.5" />
                  )}
                  {step.status === "pending" && (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-vf-fg-2" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      step.status === "done" && "text-vf-fg",
                      step.status === "loading" && "text-vf-fg",
                      step.status === "pending" && "text-vf-fg-2"
                    )}
                  >
                    {step.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Action buttons */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {message.actions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  onClick={() => onAction?.(action.label)}
                  className={cn(
                    "h-8 text-xs font-medium",
                    action.variant === "primary" &&
                      "bg-vf-green text-black hover:bg-vf-green/90",
                    action.variant === "ghost" &&
                      "bg-transparent border border-vf-border-1 text-vf-fg hover:bg-vf-bg-2 hover:border-vf-border-2"
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

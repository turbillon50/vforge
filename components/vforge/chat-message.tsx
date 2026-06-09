"use client";

import { cn } from "@/lib/utils";
import { ForgeOrb } from "@/components/ui/forge-orb";
import { IconCheck } from "@/components/brand/VFIcons";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type MessageRole = "user" | "forge";

export interface StepItem {
  text: string;
  status: "done" | "pending" | "loading" | "failed";
}

export interface ChatMessageData {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Array<{
    kind: "image";
    src: string; // data URL or http(s)
    label?: string;
  }>;
  steps?: StepItem[];
  actions?: { label: string; variant: "primary" | "ghost" }[];
}

interface ChatMessageProps {
  message: ChatMessageData;
  onAction?: (action: string) => void;
}

/**
 * Render assistant content as markdown. Raw HTML is intentionally NOT
 * allowed — react-markdown escapes by default and we don't pass
 * rehype-raw, so any `<span>` or `<div>` V dumps shows up as plain
 * text instead of HTML. This prevents the v0-style master prompt
 * leaking JSX into the chat surface.
 */
function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none vf-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Keep external links opening in a new tab
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-vf-green underline underline-offset-2 hover:text-vf-green/80"
            />
          ),
          // Inline code uses theme color
          code: (props) => {
            const { children, className, ...rest } = props;
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="rounded bg-vf-bg-2 border border-vf-border-1 px-1 py-0.5 text-[0.85em] font-mono text-vf-green-quiet"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              {...props}
              className="bg-vf-bg-2 border border-vf-border-1 rounded-md p-3 text-[12px] overflow-x-auto"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTyping = !isUser && !message.content && (!message.steps || message.steps.length === 0);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[86%] space-y-2 rounded-2xl rounded-br-md border border-vf-border-1 bg-vf-bg-3 px-4 py-3 shadow-sm sm:max-w-[78%]">
          {message.attachments?.map((att, i) =>
            att.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={att.src}
                alt={att.label ?? "imagen adjunta"}
                className="rounded border border-vf-border-1 max-h-64 w-auto object-contain"
              />
            ) : null,
          )}
          {message.content && (
            <p className="whitespace-pre-wrap text-[14px] leading-6 text-vf-fg">{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  // Forge message
  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-vf-green/25 bg-vf-green/10">
        <ForgeOrb size={18} state={isTyping ? "loading" : "idle"} glow={false} />
      </div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-vf-border-1 bg-vf-bg-1/80 px-4 py-3 shadow-sm backdrop-blur sm:max-w-[82%]">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase text-vf-green">
            V
          </span>
          {isTyping && (
            <span className="text-xs text-vf-fg-2">esta escribiendo</span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3 text-[14px] leading-6 text-vf-fg">
          {isTyping && (
            <div className="flex items-center gap-1 py-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-vf-green" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-vf-green [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-vf-green [animation-delay:240ms]" />
            </div>
          )}
          {message.content && <MarkdownContent>{message.content}</MarkdownContent>}

          {/* Steps list — tool calls rendered as visible icon list. */}
          {message.steps && message.steps.length > 0 && (
            <ul className="my-2 space-y-1.5 rounded-lg border border-vf-border bg-vf-bg-2/60 p-2">
              {message.steps.map((step, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {step.status === "done" && (
                    <IconCheck className="w-4 h-4 text-vf-green flex-shrink-0" />
                  )}
                  {step.status === "loading" && (
                    <ForgeOrb size={18} state="loading" glow={false} className="flex-shrink-0" />
                  )}
                  {step.status === "pending" && (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-vf-fg-2" />
                    </span>
                  )}
                  {step.status === "failed" && (
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-vf-error font-bold">
                      ⚠
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-mono",
                      step.status === "done" && "text-vf-fg-1",
                      step.status === "loading" && "text-vf-fg",
                      step.status === "pending" && "text-vf-fg-2",
                      step.status === "failed" && "text-vf-error"
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

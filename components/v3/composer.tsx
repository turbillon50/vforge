"use client";

import { useRef, useEffect, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerV3Props {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  /** Soft autofocus on mount (desktop only — prevents iOS keyboard jump). */
  autofocusDesktop?: boolean;
}

/**
 * Pulled-back composer inspired by Vercel's coding-agent-template:
 * - Auto-grow textarea up to ~12 rows
 * - Stop button replaces send while streaming
 * - Enter sends · Shift+Enter newline · ⌘/Ctrl+Enter sends from mobile too
 * - 16px font in textarea to block iOS Safari zoom
 * - touch-action: manipulation on tappable elements
 */
export function ComposerV3({
  onSubmit,
  onStop,
  isStreaming = false,
  placeholder = "Dile a V qué hacer…",
  autofocusDesktop = false,
}: ComposerV3Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  // Auto-grow.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scroll = el.scrollHeight;
    const max = 280;
    el.style.height = Math.min(scroll, max) + "px";
  }, [value]);

  // Desktop autofocus.
  useEffect(() => {
    if (!autofocusDesktop) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      textareaRef.current?.focus();
    }
  }, [autofocusDesktop]);

  function send() {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSubmit(text);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="w-full"
    >
      <div
        className={cn(
          "relative rounded-xl border border-vf-border bg-vf-bg-1",
          "focus-within:border-vf-fg-3 transition-colors",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck
          enterKeyHint="send"
          inputMode="text"
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-3.5 pb-12",
            "text-vf-fg placeholder:text-vf-fg-3",
            "outline-none leading-relaxed",
          )}
          style={{
            fontSize: 16, // anti-zoom iOS
            touchAction: "manipulation",
            minHeight: 56,
          }}
        />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <p className="text-[10px] font-mono text-vf-fg-3 select-none pointer-events-none">
            <span className="hidden sm:inline">
              <kbd className="text-vf-fg-2">Enter</kbd> envía ·{" "}
              <kbd className="text-vf-fg-2">⇧Enter</kbd> nueva línea
            </span>
            <span className="sm:hidden text-vf-fg-3">V tiene memoria</span>
          </p>
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Detener"
              className="pointer-events-auto h-8 w-8 flex items-center justify-center rounded-md bg-vf-fg text-vf-bg hover:bg-vf-fg-1 transition-colors"
              style={{ touchAction: "manipulation" }}
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Enviar"
              className={cn(
                "pointer-events-auto h-8 w-8 flex items-center justify-center rounded-md transition-all",
                canSend
                  ? "bg-vf-green text-black hover:bg-vf-green/90"
                  : "bg-vf-bg-2 text-vf-fg-3 cursor-not-allowed",
              )}
              style={{ touchAction: "manipulation" }}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

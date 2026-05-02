"use client";

import { useState, useRef, useEffect } from "react";
import { Paperclip, Camera, MoreHorizontal, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const iconButtonClass = cn(
    "w-10 h-10 flex items-center justify-center rounded-lg",
    "text-vf-fg-2 hover:text-vf-fg hover:bg-vf-bg-2",
    "transition-colors duration-150"
  );

  return (
    <div className="sticky bottom-0 bg-vf-bg-1 border-t border-vf-border p-3 pb-safe">
      <div className="flex items-end gap-2">
        {/* Icon buttons */}
        <div className="flex items-center gap-1">
          <button type="button" className={iconButtonClass} aria-label="Attach file">
            <Paperclip className="w-5 h-5" />
          </button>
          <button type="button" className={iconButtonClass} aria-label="Camera">
            <Camera className="w-5 h-5" />
          </button>
          <button type="button" className={iconButtonClass} aria-label="More options">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Dile a Forge qué hacer..."
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full bg-vf-bg-2 border border-vf-border-1 rounded-md",
              "px-4 py-3 text-sm text-vf-fg placeholder:text-vf-fg-2",
              "focus:outline-none focus:border-vf-border-2",
              "resize-none transition-colors duration-150",
              "min-h-[44px] max-h-[120px]"
            )}
          />
        </div>

        {/* Mic button */}
        <button
          type="button"
          className={cn(
            "w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full",
            "bg-vf-green text-black",
            "hover:bg-vf-green/90 transition-colors duration-150",
            "voice-button green-glow-sm"
          )}
          aria-label="Voice input"
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessage, type ChatMessageData } from "./chat-message";

interface ChatStreamProps {
  messages: ChatMessageData[];
  onAction?: (action: string) => void;
}

export function ChatStream({ messages, onAction }: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isNearBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
    setIsNearBottom(distance < 180);
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-3 sm:px-6 py-5 scroll-smooth"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} onAction={onAction} />
          ))}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {!isNearBottom && (
        <button
          type="button"
          onClick={() =>
            bottomRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "end",
            })
          }
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-vf-border-1 bg-vf-bg-2/95 px-3 py-1.5 text-xs font-medium text-vf-fg-1 shadow-lg backdrop-blur hover:border-vf-green/50 hover:text-vf-fg"
        >
          Bajar al chat
        </button>
      )}
    </div>
  );
}

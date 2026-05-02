"use client";

import { useRef, useEffect } from "react";
import { ChatMessage, type ChatMessageData } from "./chat-message";

interface ChatStreamProps {
  messages: ChatMessageData[];
  onAction?: (action: string) => void;
}

export function ChatStream({ messages, onAction }: ChatStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onAction={onAction} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

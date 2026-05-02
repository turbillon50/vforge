"use client";

import { useState } from "react";
import { ChatStream } from "@/components/vforge/chat-stream";
import { Composer } from "@/components/vforge/composer";
import type { ChatMessageData } from "@/components/vforge/chat-message";

// Mock conversation
const INITIAL_MESSAGES: ChatMessageData[] = [
  {
    id: "1",
    role: "user",
    content: "cambia el logo del Castores",
  },
  {
    id: "2",
    role: "forge",
    content: "Ok. Plan:",
    steps: [
      { text: "Abrir repo turbillon50/FINAL-CASTORES", status: "done" },
      { text: "Sustituir /public/logo.svg", status: "done" },
      { text: "Actualizar referencias en components/Header.tsx", status: "done" },
      { text: "Commit + deploy", status: "done" },
    ],
    actions: [
      { label: "Procede", variant: "primary" },
      { label: "Editar plan", variant: "ghost" },
    ],
  },
  {
    id: "3",
    role: "user",
    content: "procede",
  },
  {
    id: "4",
    role: "forge",
    content: "Ejecutando plan...",
    steps: [
      { text: "Repo clonado", status: "done" },
      { text: "Logo sustituido", status: "done" },
      { text: "Header actualizado", status: "done" },
      { text: "Building en Vercel...", status: "loading" },
    ],
  },
];

export default function ForgePage() {
  const [messages, setMessages] = useState<ChatMessageData[]>(INITIAL_MESSAGES);

  const handleSend = (content: string) => {
    const newMessage: ChatMessageData = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate Forge response
    setTimeout(() => {
      const forgeResponse: ChatMessageData = {
        id: (Date.now() + 1).toString(),
        role: "forge",
        content: `Entendido. Procesando: "${content}"`,
        steps: [
          { text: "Analizando solicitud...", status: "loading" },
        ],
      };
      setMessages((prev) => [...prev, forgeResponse]);
    }, 800);
  };

  const handleAction = (action: string) => {
    // Handle action button clicks
    const actionMessage: ChatMessageData = {
      id: Date.now().toString(),
      role: "user",
      content: action.toLowerCase(),
    };
    setMessages((prev) => [...prev, actionMessage]);
  };

  return (
    <div className="flex flex-col h-full -mx-4 md:-mx-6 -mt-6 -mb-6">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-vf-bg border-b border-vf-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight-vf text-vf-fg">
          Forge
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-vf-green dot-live" />
          <span className="text-sm text-vf-fg-1">Listo</span>
        </div>
      </header>

      {/* Chat stream */}
      <ChatStream messages={messages} onAction={handleAction} />

      {/* Composer */}
      <Composer onSend={handleSend} />
    </div>
  );
}

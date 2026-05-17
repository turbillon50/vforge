'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatContainer, Message } from './ChatContainer';
import { ChatComposer } from './ChatComposer';
import { V_PENDING_PROMPT_KEY } from './VDock';

const SESSION_KEY = 'v_chat_session_id';
/** Stale prompts older than this are ignored — prevents replaying yesterday's question. */
const PROMPT_TTL_MS = 10_000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return `v_${Date.now()}`;
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch {
      // localStorage may be unavailable (private mode, quota); fall back
      // to an in-memory id for this tab.
    }
  }
  return id;
}

type SSEEvent =
  | { type: 'text'; value: string }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_result'; id: string; ok: boolean; summary: string }
  | { type: 'model_fallback'; from: string; to: string; status: number | null; reason: string }
  | { type: 'done'; tokensIn: number; tokensOut: number; model: string }
  | { type: 'error'; message: string };

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(`v_${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    const ctrl = abortRef;
    return () => {
      ctrl.current?.abort();
    };
  }, []);

  // Consume pending prompt from sessionStorage (set by openV({ prompt }))
  // and auto-send. Runs on mount AND on every "vforge:open-v" event so
  // that a second card click on the same page re-triggers it.
  useEffect(() => {
    const consume = () => {
      if (typeof window === 'undefined') return;
      const raw = window.sessionStorage.getItem(V_PENDING_PROMPT_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { prompt?: string; ts?: number };
        window.sessionStorage.removeItem(V_PENDING_PROMPT_KEY);
        if (
          parsed?.prompt &&
          typeof parsed.ts === 'number' &&
          Date.now() - parsed.ts < PROMPT_TTL_MS
        ) {
          void handleSubmitRef.current?.(parsed.prompt);
        }
      } catch {
        window.sessionStorage.removeItem(V_PENDING_PROMPT_KEY);
      }
    };
    consume();
    window.addEventListener('vforge:open-v', consume);
    return () => window.removeEventListener('vforge:open-v', consume);
  }, []);

  const handleSubmitRef = useRef<((c: string) => Promise<void>) | null>(null);

  const handleSubmit = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    const assistantId = `v-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'v',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    const history = messagesRef.current.map((m) => ({
      role: m.role === 'v' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));
    history.push({ role: 'user', content });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/forge/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => '');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠ Error del servidor (${res.status}): ${err.slice(0, 200)}` }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as SSEEvent;
            if (evt.type === 'text') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + evt.value }
                    : m,
                ),
              );
            } else if (evt.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + `\n\n⚠ ${evt.message}` }
                    : m,
                ),
              );
            }
            // tool_use_start / tool_use_result / model_fallback / done
            // are not surfaced in this minimal UI — text is what carries
            // V's voice. The /forge route renders the full tool ribbon.
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `⚠ Error de red: ${msg}` } : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep the ref up to date so the "vforge:open-v" listener sees the
  // latest handler closure.
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  return (
    <div className="flex flex-col h-full bg-vf-bg-0">
      <ChatContainer messages={messages} isLoading={isLoading} className="flex-1" />
      <ChatComposer onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
};

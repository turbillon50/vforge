'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatContainer, type Message } from './ChatContainer';
import { ChatComposer } from './ChatComposer';
import { createTypewriter } from '@/lib/chat/typewriter';
import type { ThinkingPhase } from './VThinking';
import type { TraceEntry } from './ProcessTrace';

const SESSION_KEY = 'v_chat_session_id';

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
  const [phase, setPhase] = useState<ThinkingPhase>('thinking');
  const sessionIdRef = useRef<string>(`v_${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const typewriterRef = useRef<ReturnType<typeof createTypewriter> | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    return () => {
      abortRef.current?.abort();
      typewriterRef.current?.cancel();
    };
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    typewriterRef.current?.flush();
    typewriterRef.current = null;
    setIsLoading(false);
  }, []);

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
      traces: [],
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setPhase('thinking');

    const history = messagesRef.current.map((m) => ({
      role: m.role === 'v' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));
    history.push({ role: 'user', content });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Typewriter feeds the assistant message at humanlike pace.
    typewriterRef.current?.cancel();
    typewriterRef.current = createTypewriter({
      onChunk: (text) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + text } : m,
          ),
        );
      },
    });
    const typewriter = typewriterRef.current;

    const appendTrace = (entry: TraceEntry | ((prev: TraceEntry[]) => TraceEntry[])) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const prevTraces = m.traces ?? [];
          const nextTraces =
            typeof entry === 'function' ? entry(prevTraces) : [...prevTraces, entry];
          return { ...m, traces: nextTraces };
        }),
      );
    };

    let hasSeenText = false;

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
              if (!hasSeenText) {
                hasSeenText = true;
                setPhase('writing');
              }
              typewriter.push(evt.value);
            } else if (evt.type === 'tool_use_start') {
              setPhase('reasoning');
              appendTrace({
                id: evt.id,
                tool: evt.name,
                status: 'running',
              });
            } else if (evt.type === 'tool_use_result') {
              appendTrace((prev) =>
                prev.map((t) =>
                  t.id === evt.id
                    ? {
                        ...t,
                        status: evt.ok ? 'ok' : 'error',
                        summary: evt.summary?.slice(0, 120),
                      }
                    : t,
                ),
              );
            } else if (evt.type === 'done') {
              setPhase('finalizing');
            } else if (evt.type === 'error') {
              typewriter.flush();
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + `\n\n⚠ ${evt.message}` }
                    : m,
                ),
              );
            }
            // model_fallback is intentionally not surfaced — the user only
            // cares that V responded, not which provider tier served it.
          } catch {
            // skip malformed event
          }
        }
      }

      await typewriter.complete();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      typewriter.flush();
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `⚠ Error de red: ${msg}` } : m,
        ),
      );
    } finally {
      setIsLoading(false);
      typewriterRef.current = null;
    }
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 bg-vf-bg-0">
      <ChatContainer
        messages={messages}
        isLoading={isLoading}
        phase={phase}
        className="flex-1 min-h-0"
      />
      <ChatComposer onSubmit={handleSubmit} isLoading={isLoading} onStop={handleStop} />
    </div>
  );
};

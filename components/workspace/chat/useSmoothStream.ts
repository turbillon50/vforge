"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Options {
  // Target ms per character when the buffer is small. ~15ms/char ≈ 66 chars/s.
  msPerChar?: number;
  // When the backlog exceeds this many chars, accelerate so the typewriter
  // doesn't fall behind. Cap drain at maxCharsPerSec.
  backlogThreshold?: number;
  maxCharsPerSec?: number;
  // If true, ignore the typewriter cadence and dump everything (used for
  // prefers-reduced-motion and for the initial hydration of past messages).
  immediate?: boolean;
}

interface SmoothStream {
  /** Text currently visible to the user. */
  displayed: string;
  /** Append a chunk to the pending buffer; it'll be drained char-by-char. */
  push: (chunk: string) => void;
  /** Force any pending chars to render immediately (call when SSE closes). */
  flush: () => void;
  /** Reset to empty (new message). */
  reset: () => void;
}

/**
 * Buffered typewriter for streamed LLM output. Drains a pending queue inside
 * requestAnimationFrame so we feel char-by-char regardless of how chunky the
 * underlying SSE delivery is. Pauses when the tab is hidden; flushes on demand.
 *
 * This is purely cosmetic — it never blocks or transforms the data, just
 * controls the render cadence.
 */
export function useSmoothStream(options: Options = {}): SmoothStream {
  const {
    msPerChar = 15,
    backlogThreshold = 200,
    maxCharsPerSec = 300,
    immediate = false,
  } = options;

  const [displayed, setDisplayed] = useState("");
  const pendingRef = useRef("");
  const lastFrameRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const immediateRef = useRef(immediate);

  useEffect(() => {
    immediateRef.current = immediate;
  }, [immediate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = useCallback((now: number) => {
    if (!mountedRef.current) return;
    const pending = pendingRef.current;
    if (!pending) {
      rafRef.current = null;
      lastFrameRef.current = 0;
      return;
    }
    if (lastFrameRef.current === 0) lastFrameRef.current = now;
    const dt = now - lastFrameRef.current;

    let charsPerSec = 1000 / msPerChar;
    if (pending.length > backlogThreshold) {
      const overshoot = pending.length / backlogThreshold;
      charsPerSec = Math.min(maxCharsPerSec, charsPerSec * overshoot);
    }
    let take = Math.max(1, Math.floor((dt / 1000) * charsPerSec));
    if (take > pending.length) take = pending.length;

    const slice = pending.slice(0, take);
    pendingRef.current = pending.slice(take);
    lastFrameRef.current = now;
    setDisplayed((d) => d + slice);

    if (pendingRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      lastFrameRef.current = 0;
    }
  }, [msPerChar, backlogThreshold, maxCharsPerSec]);

  const ensureLoop = useCallback(() => {
    if (rafRef.current != null) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible") ensureLoop();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [ensureLoop]);

  const push = useCallback((chunk: string) => {
    if (!chunk) return;
    if (immediateRef.current) {
      setDisplayed((d) => d + chunk);
      return;
    }
    pendingRef.current += chunk;
    ensureLoop();
  }, [ensureLoop]);

  const flush = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const rest = pendingRef.current;
    pendingRef.current = "";
    lastFrameRef.current = 0;
    if (rest) setDisplayed((d) => d + rest);
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = "";
    lastFrameRef.current = 0;
    setDisplayed("");
  }, []);

  return { displayed, push, flush, reset };
}

/** Detects the user's prefers-reduced-motion preference. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Token-by-token typewriter for V's streaming responses.
 *
 * The model often emits text in chunks of dozens or hundreds of characters at
 * once (especially right after a tool round finishes). Painting those chunks
 * directly to the DOM makes the message "snap" into view instead of feeling
 * spoken. This helper queues incoming text and releases characters with a
 * humanlike rhythm via requestAnimationFrame.
 *
 * Usage:
 *   const tw = createTypewriter({ onChunk: (text) => setMessage(prev => prev + text) });
 *   tw.push(deltaFromSse);          // feed text as it arrives
 *   tw.flush();                     // drop the queue (e.g. on Stop)
 *   await tw.complete();            // wait for the queue to drain
 *   tw.cancel();                    // abandon everything
 */

interface TypewriterOptions {
  onChunk: (text: string) => void;
  charsPerSecond?: number;
}

export interface Typewriter {
  push: (text: string) => void;
  flush: () => void;
  cancel: () => void;
  complete: () => Promise<void>;
}

const PUNCT_PAUSE_MS: Record<string, number> = {
  '.': 90,
  '!': 90,
  '?': 90,
  ',': 45,
  ';': 60,
  ':': 60,
  '\n': 70,
};

export function createTypewriter({
  onChunk,
  charsPerSecond = 55,
}: TypewriterOptions): Typewriter {
  let queue = '';
  let cancelled = false;
  let pumping = false;
  let lastTick = 0;
  let pauseUntil = 0;
  let resolveComplete: (() => void) | null = null;
  let budget = 0;

  const tick = (now: number) => {
    if (cancelled) return;
    if (!queue.length) {
      pumping = false;
      if (resolveComplete) {
        resolveComplete();
        resolveComplete = null;
      }
      return;
    }
    if (now < pauseUntil) {
      requestAnimationFrame(tick);
      return;
    }
    const dt = lastTick ? Math.min(now - lastTick, 100) : 16;
    lastTick = now;
    budget += (charsPerSecond * dt) / 1000;

    let toRelease = '';
    while (budget >= 1 && queue.length) {
      const ch = queue[0];
      queue = queue.slice(1);
      toRelease += ch;
      budget -= 1;
      const pause = PUNCT_PAUSE_MS[ch];
      if (pause) {
        pauseUntil = now + pause + Math.random() * 40;
        break;
      }
    }
    if (toRelease) onChunk(toRelease);

    if (queue.length || pauseUntil > now) {
      requestAnimationFrame(tick);
    } else {
      pumping = false;
      if (resolveComplete) {
        resolveComplete();
        resolveComplete = null;
      }
    }
  };

  const start = () => {
    if (pumping || cancelled) return;
    pumping = true;
    lastTick = 0;
    requestAnimationFrame(tick);
  };

  return {
    push(text: string) {
      if (cancelled || !text) return;
      queue += text;
      start();
    },
    flush() {
      if (queue.length) {
        onChunk(queue);
        queue = '';
      }
    },
    cancel() {
      cancelled = true;
      queue = '';
      if (resolveComplete) {
        resolveComplete();
        resolveComplete = null;
      }
    },
    complete() {
      if (!queue.length && !pumping) return Promise.resolve();
      return new Promise<void>((resolve) => {
        resolveComplete = resolve;
        start();
      });
    },
  };
}

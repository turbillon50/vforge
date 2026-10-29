import type { MemoryContext, MemorySource } from './continuity';

/** A rejected archive request must preserve the original textual fallback. */
export function selectMemoryResults(results: PromiseSettledResult<MemorySource[]>[]): MemoryContext {
  const [archive, personal, ...legacy] = results;
  const chosen = archive?.status === 'fulfilled' ? [archive, personal] : [personal, ...legacy];
  const successful = results.filter(r=>r.status === 'fulfilled').length;
  return {
    status: successful === results.length && successful > 0 ? 'available' : successful ? 'partial' : 'unavailable',
    sources: chosen.flatMap(r=>r?.status === 'fulfilled' ? r.value : []),
  };
}

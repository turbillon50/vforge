/** Server-to-server transport; identity, retrieval and history stay canonical in VForge. */
export type ParadoxInput = { action: 'context'|'commit'; session_id: string; turn_id: string; message: string; answer?: string; model?: string };
export function parseParadoxInput(value: unknown): ParadoxInput | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Record<string, unknown>;
  if (!['context','commit'].includes(String(b.action)) || typeof b.session_id !== 'string' ||
      !/^paradox_v_[a-f0-9]{32}$/.test(b.session_id) || typeof b.turn_id !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(b.turn_id) ||
      typeof b.message !== 'string' || !b.message.trim() || b.message.length > 1500) return null;
  if (b.action === 'commit' && (typeof b.answer !== 'string' || !b.answer.trim() || b.answer.length > 20000 ||
      typeof b.model !== 'string' || !/^[a-zA-Z0-9_.:/-]{1,120}$/.test(b.model))) return null;
  return { action: b.action as ParadoxInput['action'], session_id:b.session_id, turn_id:b.turn_id,
    message:b.message.trim(), ...(b.action === 'commit' ? { answer:(b.answer as string).trim(), model:b.model as string } : {}) };
}

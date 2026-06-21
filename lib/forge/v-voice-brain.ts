/**
 * Re-exporta voiceBrain desde el cerebro unificado de V.
 * V usa claude --print en Hetzner (cuenta de usuario de Luis, sin API key).
 */
export type { ChatTurn } from "@/lib/forge/v-brain";
export { voiceBrain } from "@/lib/forge/v-brain";

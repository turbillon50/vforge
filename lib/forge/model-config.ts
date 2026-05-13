/**
 * Model routing configuration via env vars.
 * No model is hardcoded — all driven by environment.
 * Cascade fallback: FREE → FAST → CHAT_MAIN
 */

export const MODEL_CONFIG = {
  // Tier 2 — Premium (solo conversación con Luis y arquitectura)
  CHAT_MAIN: process.env.MODEL_CHAT_MAIN ?? 'anthropic/claude-sonnet-4.5',

  // Tier 1 — Baratos
  CODE: process.env.MODEL_CODE ?? 'deepseek/deepseek-chat',
  FAST: process.env.MODEL_FAST ?? 'google/gemini-2.5-flash',

  // Tier 0 — Gratis
  FREE: process.env.MODEL_FREE ?? 'meta-llama/llama-3.3-70b-instruct',
  CLASSIFY: process.env.MODEL_CLASSIFY ?? 'meta-llama/llama-3.1-8b-instruct',
  TRANSLATE: process.env.MODEL_TRANSLATE ?? 'qwen/qwen-2-7b-instruct',
} as const

/**
 * Cascade fallback chain.
 * Si FREE falla → FAST → CHAT_MAIN
 */
export const FALLBACK_CHAIN = [
  MODEL_CONFIG.FREE,
  MODEL_CONFIG.FAST,
  MODEL_CONFIG.CHAT_MAIN,
] as const

/**
 * Routing por tipo de tarea.
 * Usa el modelo más barato que pueda hacer el trabajo.
 */
export function getModelForTask(task: keyof typeof TASK_MODEL_MAP): string {
  return TASK_MODEL_MAP[task]
}

const TASK_MODEL_MAP = {
  // Luis directo — solo Sonnet
  'chat-main':      MODEL_CONFIG.CHAT_MAIN,
  'architecture':   MODEL_CONFIG.CHAT_MAIN,

  // Código — DeepSeek
  'code-edit':      MODEL_CONFIG.CODE,
  'code-review':    MODEL_CONFIG.CODE,

  // Análisis — Gemini Flash
  'summarization':  MODEL_CONFIG.FAST,
  'reasoning':      MODEL_CONFIG.FAST,
  'extraction':     MODEL_CONFIG.FAST,

  // Gratis — Llama/Qwen/Phi
  'classification': MODEL_CONFIG.CLASSIFY,
  'translation':    MODEL_CONFIG.TRANSLATE,
  'brainstorm':     MODEL_CONFIG.FREE,
  'scout':          MODEL_CONFIG.FREE,
} as const

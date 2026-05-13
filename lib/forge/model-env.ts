/**
 * Model selection via environment variables.
 *
 * Cada tarea tiene su modelo configurable via env var.
 * Cascade fallback: FREE → FAST → CHAT_MAIN
 *
 * Ahorro estimado: 92% vs todo Sonnet ($8-15/mes vs $150-200/mes)
 */

export const MODEL_OVERRIDES = {
  /** Conversación principal con Luis — solo aquí va Sonnet */
  CHAT_MAIN: process.env.MODEL_CHAT_MAIN ?? "anthropic/claude-sonnet-4.6",

  /** Generación y edición de código */
  CODE: process.env.MODEL_CODE ?? "deepseek/deepseek-chat",

  /** Análisis, resumen, marketing (Goosip), Tanit */
  FAST: process.env.MODEL_FAST ?? "google/gemini-2.5-flash",

  /** Clasificación, filtros, Scout Engine */
  CLASSIFY: process.env.MODEL_CLASSIFY ?? "meta-llama/llama-3.3-70b-instruct",

  /** Traducción multilingüe */
  TRANSLATE: process.env.MODEL_TRANSLATE ?? "qwen/qwen-2-7b-instruct",

  /** Tareas simples, respuestas cortas */
  FREE: process.env.MODEL_FREE ?? "meta-llama/llama-3.3-70b-instruct",
} as const;

/**
 * Cascade fallback por tarea.
 * Si el modelo primario falla → intenta el siguiente → nunca se rompe.
 */
export const MODEL_CASCADE: Record<string, string[]> = {
  "chat-main": [
    MODEL_OVERRIDES.CHAT_MAIN,
    MODEL_OVERRIDES.FAST,
    "minimax/minimax-m2.5:free",
  ],
  "code-edit": [
    MODEL_OVERRIDES.CODE,
    MODEL_OVERRIDES.FAST,
    MODEL_OVERRIDES.FREE,
  ],
  "reasoning": [
    MODEL_OVERRIDES.CHAT_MAIN,
    MODEL_OVERRIDES.FAST,
    MODEL_OVERRIDES.FREE,
  ],
  "classification": [
    MODEL_OVERRIDES.CLASSIFY,
    MODEL_OVERRIDES.FAST,
    "minimax/minimax-m2.5:free",
  ],
  "summarization": [
    MODEL_OVERRIDES.FAST,
    MODEL_OVERRIDES.CLASSIFY,
    "minimax/minimax-m2.5:free",
  ],
  "extraction": [
    MODEL_OVERRIDES.FAST,
    MODEL_OVERRIDES.CLASSIFY,
    MODEL_OVERRIDES.FREE,
  ],
};

/**
 * Agentes de la familia — cada quien con su cerebro
 */
export const AGENT_MODELS = {
  V:      MODEL_OVERRIDES.CHAT_MAIN,   // Claude Sonnet — habla con Luis
  TANIT:  MODEL_OVERRIDES.FAST,        // Gemini Flash — trading/análisis
  BREACK: MODEL_OVERRIDES.FREE,        // Llama gratis — brainstorm
  GOOSIP: MODEL_OVERRIDES.FAST,        // Gemini Flash — marketing
  SCOUT:  MODEL_OVERRIDES.CLASSIFY,    // Llama gratis — filtrar noticias
} as const;

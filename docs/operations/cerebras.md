# Motor Cerebras (sin OpenRouter)

## Variables en Vercel (`vforge`)

| Variable | Uso |
|----------|-----|
| `CEREBRAS_API_KEY` | API key Cerebras (obligatoria para el motor nuevo) |
| `CEREBRAS_BASE_URL` | Default `https://api.cerebras.ai/v1`. Si tienes **endpoint dedicado / nuestras GPUs**, pon aquí la base OpenAI-compatible (`https://tu-endpoint/.../v1`) |
| `CEREBRAS_MODEL` | Default del chat, ej. `llama-3.3-70b`, `qwen-3-32b`, `gpt-oss-120b` |
| `MODEL_CHAT_MAIN` | Override opcional (misma forma) |

## Comportamiento

1. Si existe `CEREBRAS_API_KEY` → **todo el chat de Estudio usa Cerebras**.
2. Slugs viejos `anthropic/claude-*` se **remapear** al modelo Cerebras default (no se llama OpenRouter ni Claude).
3. OpenRouter solo si **no** hay key de Cerebras (fallback de emergencia).

## Modelos públicos típicos

- `llama-3.3-70b`
- `llama3.1-8b`
- `qwen-3-32b`
- `gpt-oss-120b`

Ver catálogo: https://inference-docs.cerebras.ai/

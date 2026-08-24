# Motor Cerebras (sin OpenRouter)

## Origen de credenciales

En Hetzner (`/root/mesh-router/config.json` → bloque `cerebras`):

- `base`: `https://api.cerebras.ai/v1`
- `default_model`: `gpt-oss-120b`
- `models`: `gpt-oss-120b`, `gemma-4-31b`

También alimenta `/opt/vchat-local` (v.mindcontextia.one).

## Variables en Vercel (`vforge`)

| Variable | Uso |
|----------|-----|
| `CEREBRAS_API_KEY` | Key del mesh (encrypted) |
| `CEREBRAS_BASE_URL` | `https://api.cerebras.ai/v1` (o endpoint GPU dedicado) |
| `CEREBRAS_MODEL` | Default `gpt-oss-120b` |
| `MODEL_CHAT_MAIN` | Override chat Estudio |

## Comportamiento

1. Con `CEREBRAS_API_KEY` → Estudio usa **solo Cerebras**.
2. Slugs `anthropic/claude-*` se remapean al modelo Cerebras.
3. OpenRouter solo si no hay key Cerebras.

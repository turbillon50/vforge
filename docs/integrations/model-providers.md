# Integración: Model Providers (Anthropic + OpenAI + Gemini + Perplexity)

> *Llaves de los 4 proveedores de modelos IA que el cerebro Forge va a routear via la routing policy del M2. Verificadas en vivo, cableadas como Vercel env vars encrypted.*

---

## Resumen

| Provider | Env var | Capability foco | Verificado |
|---|---|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` | Razonamiento, código, tool use | ✅ Opus 4-7, Sonnet 4-6, Haiku 4-5 |
| **OpenAI** | `OPENAI_API_KEY` | Imagen, audio, embeddings | ✅ 115 modelos disponibles |
| **Google Gemini** | `GEMINI_API_KEY` | Multimodal cheap, long context | ✅ 50 modelos (2.5 Pro/Flash) |
| **Perplexity** | `PERPLEXITY_API_KEY` | Web search con citas | ✅ sonar respondió |

Implementado: 2026-05-02 · vForge MVP

---

## Endpoints de health-check

### Anthropic (auth: `x-api-key` header + `anthropic-version`)

```bash
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     "https://api.anthropic.com/v1/models?limit=5"
```

Devuelve los modelos disponibles. Costo health-check: **$0** (no consume tokens).

### OpenAI (auth: `Authorization: Bearer ...`)

```bash
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     "https://api.openai.com/v1/models"
```

Devuelve ~100+ modelos. Costo: **$0**. La key project-scoped (`sk-proj-...`) limita scopes a un solo project en OpenAI dashboard — más seguro que account-wide keys.

### Gemini (auth: `?key=...` query param)

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

Costo: **$0**. Nota: Google usa query param, no header. Hay que escapar bien en logs.

### Perplexity (auth: `Authorization: Bearer ...`)

No hay `/models` endpoint público. Health-check con un POST mínimo:

```bash
curl -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
     -H "Content-Type: application/json" \
     -X POST "https://api.perplexity.ai/chat/completions" \
     -d '{"model":"sonar","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```

Costo: **~$0.0001** (5 tokens). El menor "real call" para validar.

---

## Mapeo al routing policy (M2 del cerebro Forge)

```ts
// lib/forge/routing.ts (cuando llegue M2)

function route(step: PlanStep): { provider: Provider; model: string } {
  switch (step.kind) {
    case 'reasoning':       return { provider: 'anthropic', model: 'claude-opus-4-7' };
    case 'code-edit':       return { provider: 'anthropic', model: 'claude-sonnet-4-6' }; // o Claude Code SDK
    case 'classify':        return { provider: 'anthropic', model: 'claude-haiku-4-5' };
    case 'image-gen':       return { provider: 'openai',    model: 'chatgpt-image-latest' };
    case 'voice-transcribe':return { provider: 'openai',    model: 'whisper-1' };
    case 'embedding':       return { provider: 'openai',    model: 'text-embedding-3-large' };
    case 'long-context':    return { provider: 'gemini',    model: 'gemini-2.5-pro' };
    case 'cheap-multimodal':return { provider: 'gemini',    model: 'gemini-2.5-flash' };
    case 'web-search':      return { provider: 'perplexity', model: 'sonar' };
    case 'web-research':    return { provider: 'perplexity', model: 'sonar-pro' };
    default:                return { provider: 'anthropic', model: 'claude-haiku-4-5' };
  }
}
```

Cada caso tiene fallback a otro proveedor en caso de outage (ver ADR-005).

---

## Costos aproximados (USD por 1M tokens, ref. abril 2026)

| Modelo | Input | Output | Uso típico en Forge |
|---|---|---|---|
| `claude-opus-4-7` | $15 | $75 | Razonamiento complejo, planning multi-step |
| `claude-sonnet-4-6` | $3 | $15 | Tool use balanceado, edición de código |
| `claude-haiku-4-5` | $0.80 | $4 | Routing classifier, replies cortos |
| `gpt-4.1` | $2 | $8 | General multimodal |
| `gpt-4o` | $2.50 | $10 | Vision + chat |
| `gpt-4o-mini` | $0.15 | $0.60 | Tareas baratas con vision |
| `chatgpt-image-latest` | n/a | $0.04–$0.17/img | Logos, mockups, OG images |
| `whisper-1` | n/a | $0.006/min | Transcripción del botón mic |
| `gemini-2.5-pro` | $1.25 | $10 | Long context (>1M tokens) |
| `gemini-2.5-flash` | $0.075 | $0.30 | Cheap multimodal a escala |
| `sonar` (Perplexity) | $1 | $1 | Web search ground-truth |
| `sonar-pro` (Perplexity) | $3 | $15 | Investigación profunda |

**Decisión de routing:** privilegiar Haiku para clasificación, Sonnet para ejecución, Opus solo cuando hace falta razonar. Gemini Flash para cualquier multimodal cheap a alto volumen. Imagen de OpenAI cuando se necesite generar visual. Whisper para audio. Perplexity cuando la pregunta requiera información actualizada de web.

---

## Runbook ejecutado

### Paso 1 — Stash

```bash
umask 077
cat > /tmp/.models-env <<EOF
export GEMINI_API_KEY='AIza...'
export OPENAI_API_KEY='sk-proj-...'
export PERPLEXITY_API_KEY='pplx-...'
export ANTHROPIC_API_KEY='sk-ant-api03-...'
EOF
chmod 600 /tmp/.models-env
```

### Paso 2 — Health-check de cada proveedor

(Ver bloques de código arriba.) Cada uno responde sin error → key válida + cuenta funcional.

### Paso 3 — Cablear en Vercel

Cuatro variables, todas `encrypted`, target `production + preview`:

```bash
for KEY in ANTHROPIC_API_KEY OPENAI_API_KEY GEMINI_API_KEY PERPLEXITY_API_KEY; do
  curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
    -d "{\"key\":\"$KEY\",\"value\":\"...\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}"
done
```

### Paso 4 — Cleanup

```bash
rm -f /tmp/.models-env
```

---

## Caveats observados

1. **OpenAI keys project-scoped vs account-wide.** La que recibimos es `sk-proj-` → solo aplica a un proyecto específico de OpenAI. **Mejor que account-wide** porque limita el blast radius de una eventual fuga. Verificar en OpenAI dashboard que el proyecto tenga budget cap.
2. **Gemini usa query param, no header.** `?key=...` queda en logs HTTP/proxies por defecto si el log incluye query strings. Forge AI debe redactar la query string antes de loggear. Algunos firewalls también logean query strings — preferir headers cuando se pueda en el futuro (Gemini API tiene OAuth además).
3. **Perplexity sin endpoint de models.** No hay `/v1/models` — el único health-check es una llamada real (mínima). Eso significa que verificar la key cuesta tokens. Forge AI debe cachear el "key validation result" por 1 hora para no quemar tokens en cada redeploy.
4. **Anthropic multi-version.** El header `anthropic-version: 2023-06-01` es el actual estable. Si Anthropic publica una nueva, las features cambian. Forge AI debe pinear la versión y migrar deliberadamente vía ADR.
5. **Costo runaway.** Sin cost caps, una loop infinita en Forge puede quemar $100+ en minutos con Opus. M9 implementa cost cap por usuario y por proyecto. **Mientras tanto, el operador (Luis) revisa el dashboard de cada proveedor manualmente cada deploy.**

---

## Estado final del Vercel env (11 vars)

```
NEXT_PUBLIC_SITE_URL              plain      https://vforge.site
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY plain      pk_live_...
NEON_ORG_ID                       plain      org-super-wind-01105205
NEON_PROJECT_ID                   plain      morning-lab-81926607

DATABASE_URL                      encrypted  postgresql://...
NEON_API_KEY                      encrypted  napi_...
CLERK_SECRET_KEY                  encrypted  sk_live_...
ANTHROPIC_API_KEY                 encrypted  sk-ant-api03-...
OPENAI_API_KEY                    encrypted  sk-proj-...
GEMINI_API_KEY                    encrypted  AIza...
PERPLEXITY_API_KEY                encrypted  pplx-...
```

**Listo para arrancar M0 (Vault real) y M1 (Brain endpoint stub) sin más fricción de credenciales.**

---

## Cuando Forge AI lo ejecute (M3+)

Adapter pattern:

```ts
// lib/forge/adapters/anthropic.ts
// lib/forge/adapters/openai.ts
// lib/forge/adapters/gemini.ts
// lib/forge/adapters/perplexity.ts

interface ModelAdapter {
  invoke(input: { model: string; messages: Message[]; tools?: Tool[] }): AsyncIterable<Event>;
  estimateCost(input: { model: string; tokensIn: number; tokensOut: number }): number;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
```

Cada adapter implementa el contrato y se registra en `lib/forge/registry.ts`. La routing policy decide cuál llamar.

---

## Referencias

- Anthropic API: https://docs.anthropic.com/en/api/getting-started
- OpenAI API: https://platform.openai.com/docs/api-reference
- Gemini API: https://ai.google.dev/gemini-api/docs
- Perplexity API: https://docs.perplexity.ai/api-reference

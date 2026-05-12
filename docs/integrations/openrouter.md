# Integración: OpenRouter (gateway secundario a LLMs no-Anthropic)

> *Entra en M3 (Fase 1) como adapter paralelo al de Anthropic directo. No reemplaza a `anthropic-claude`; añade Gemini, Mistral, Llama y similares para tareas baratas o como fallback cuando Anthropic se degrade. ADR-009 lo declara secundario por decisión deliberada (ver ADR-005).*

---

## Resumen

- **Provider:** [OpenRouter](https://openrouter.ai) — aggregator OpenAI-compatible sobre 100+ modelos
- **Rol en vForge:** gateway secundario a LLMs no-Anthropic (Gemini, Mistral, Llama, etc.) para cost optimization y fallback. No reemplaza el adapter Anthropic directo cableado en `app/api/forge/run/route.ts`.
- **Milestone:** M3 — Fase 1
- **Anillo:** 0-1 (lectura/razonamiento; sin acción destructiva por sí solo)
- **Adapter file (futuro):** `lib/forge/adapters/openrouter.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
OPENROUTER_API_KEY    sk-or-v1-...   key del dashboard OpenRouter, server-side encrypted
```

Una sola variable. El endpoint es estático y el modelo se elige por request, no se fija como env.

---

## Cuenta y onboarding

Pasos exactos que Luis debe hacer:

1. Ir a https://openrouter.ai/sign-up — registrarse con email o GitHub OAuth (recomendado GitHub para consolidar identidades).
2. Cargar saldo en https://openrouter.ai/credits — OpenRouter es prepago, no suscripción. Cargar al menos $10 USD para Fase 1; el costo por request se descuenta del saldo.
3. Generar key en https://openrouter.ai/keys → "Create Key" → nombrar `vforge-prod`. Copiar el `sk-or-v1-...` (no se vuelve a mostrar).
4. (Opcional) configurar rate limit y spending cap por key desde el mismo dashboard.
5. Agregar la key a `operator_secrets` vía vForge (cuando M0 esté listo) o a Vercel env vars como `OPENROUTER_API_KEY` (encrypted, production + preview + development).

---

## Endpoints / SDK usados

OpenRouter es **OpenAI-compatible**. Se usa el SDK oficial de OpenAI apuntándolo al base URL de OpenRouter.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://vforge.site",
    "X-Title": "vForge",
  },
});

const res = await client.chat.completions.create({
  model: "google/gemini-2.5-flash",
  messages: [{ role: "user", content: "ping" }],
});
```

Endpoints relevantes (todos bajo `https://openrouter.ai/api/v1`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/models` | GET | Listar modelos disponibles + pricing |
| `/chat/completions` | POST | Inference (OpenAI-compatible) |
| `/auth/key` | GET | Verificar key + saldo restante |

---

## Runbook (cuando ejecutemos M3)

1. Verificar que `OPENROUTER_API_KEY` existe vía `getOperatorSecret("OPENROUTER_API_KEY", { auditUserId: ctx.userId })` en `lib/vault/get-secret.ts`. Si falla, devolver `missing-key` al health check.
2. Crear `lib/forge/adapters/openrouter.ts` implementando el contract de `lib/forge/adapters/_contract.ts` (`ForgeAdapter<ChatInput, ChatOutput>`). Capacidades: `["reasoning", "classification", "summarization"]`. Anillo 0-1.
3. Registrar entradas en `lib/forge/models.ts` para los modelos canónicos a ofrecer en Fase 1: `google/gemini-2.5-flash` (clasificación barata), `mistralai/mistral-large` (resúmenes), `meta-llama/llama-3.3-70b-instruct` (experimentos).
4. Extender el switch de `lib/forge/routing.ts` para que `step.kind === "classify"` o `"summarize"` con hint `"cheap"` ruten a OpenRouter en vez de Anthropic Haiku.
5. Agregar test mínimo en `lib/forge/adapters/__tests__/openrouter.test.ts`: happy path (mock 200) + missing-key (throw).
6. Update a `lib/forge/system-prompt.ts`: documentar a V que puede pedir routing a Gemini/Mistral cuando la tarea sea simple y la velocidad/costo importen más que calidad de razonamiento.

---

## Caveats / notas operativas

- **Prepago, no suscripción.** Si el saldo llega a $0, todas las requests fallan con 402. Health check debe alertar cuando el saldo baje de $5.
- **Latencia variable por modelo.** Gemini Flash ~300ms; Llama 70B ~2-4s. La routing policy debe considerar latency en el adapter metadata.
- **Headers `HTTP-Referer` y `X-Title`** son opcionales pero recomendados — habilitan el dashboard de analytics y dan ranking en el leaderboard público de OpenRouter (opt-out disponible).
- **Rotación de key:** desde el dashboard `/keys` → revoke + create new. Actualizar `operator_secrets` y triggear redeploy de Vercel.
- **Vendor lock-in:** trivial — al ser OpenAI-compatible, migrar a Together.ai, Fireworks, o a SDKs directos del proveedor (Google, Mistral, Meta) es cambiar `baseURL` y el formato del campo `model`.

---

## Estado de env vars en Vercel

```
OPENROUTER_API_KEY    encrypted    PENDIENTE — agregar antes de M3
```

---

## Referencias

- Docs: https://openrouter.ai/docs
- Models + pricing: https://openrouter.ai/models
- Dashboard: https://openrouter.ai/keys

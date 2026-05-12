# Integración: Polar.sh (billing + subscriptions + usage-based pass-through)

> *Entra en M14 (Fase 2). Cumple el pass-through prometido en ADR-006: clientes externos pagan el costo de Anthropic/OpenAI + margen. Polar wrappea Stripe con DX para SaaS developer-first — customer portal, usage metering, webhooks ya implementados. ADR-009 lo eligió sobre Stripe directo por eso.*

---

## Resumen

- **Provider:** [Polar.sh](https://polar.sh) — billing + monetización para developer SaaS, wrap sobre Stripe
- **Rol en vForge:** subscriptions + usage-based billing pass-through del costo de Anthropic/OpenAI + margen. Customer portal embebido, webhooks para sync con Neon, checkout hosted.
- **Milestone:** M14 — Fase 2
- **Anillo:** 2-3 (checkout y subscriptions = Anillo 2; refunds y cancelaciones = Anillo 3)
- **Adapter file (futuro):** `lib/forge/adapters/polar-billing.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
POLAR_ACCESS_TOKEN       polar_oat_...   organization access token, server-side encrypted
POLAR_ORGANIZATION_ID    org_...         ID de la organización (plain)
POLAR_WEBHOOK_SECRET     whsec_...       secret para validar firmas de webhooks
```

Tres variables. Webhook secret y access token van encrypted; organization ID es plain.

---

## Cuenta y onboarding

1. Ir a https://polar.sh — sign up con GitHub OAuth (Polar es GitHub-first).
2. Crear organización: nombrarla algo como `vforge` o `all-global-holding`. El slug se vuelve público en el customer portal.
3. Conectar Stripe como underlying processor: dashboard → Settings → Payments → Connect Stripe. Polar pide la cuenta de Stripe del operador (Luis); todos los pagos llegan ahí, Polar toma fee 4% + Stripe fee.
4. Configurar tax + business info (RFC mexicano, address): Settings → Tax. Necesario para emitir facturas/invoices válidas.
5. Crear productos iniciales: dashboard → Products → "New product". Plan sugerido inicial: `vforge-starter` ($20/mes, 100 runs incluidos), `vforge-pro` ($100/mes, 1000 runs), pass-through extra runs.
6. Generar organization access token: Settings → Developers → "Create Token" → scopes: `products:read`, `subscriptions:write`, `customers:read`, `webhooks:write`. Copiar el `polar_oat_...`.
7. Crear webhook endpoint: Settings → Webhooks → "Add endpoint" → URL `https://vforge.site/api/webhooks/polar` → events: `subscription.created`, `subscription.updated`, `subscription.canceled`, `invoice.paid`. Copiar el `whsec_...`.
8. Agregar `POLAR_ACCESS_TOKEN` (encrypted), `POLAR_ORGANIZATION_ID` (plain), `POLAR_WEBHOOK_SECRET` (encrypted) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Polar tiene SDK TypeScript oficial. Patrón típico: crear customer al onboarding del tenant, generar checkout URL, escuchar webhooks para activar features.

```ts
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
});

// 1. Crear checkout para un plan
const checkout = await polar.checkouts.create({
  productPriceId: priceId,
  successUrl: "https://vforge.site/billing/success",
  customerEmail: user.email,
  customerExternalId: tenantId, // nuestro ID para sync via webhook
});
// redirect a checkout.url

// 2. Reportar usage (usage-based billing)
await polar.usage.ingest({
  customerId: customer.id,
  meterId: "anthropic-tokens",
  value: tokensUsed,
});
```

Endpoints relevantes (bajo `https://api.polar.sh/v1`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/checkouts` | POST | Crear checkout URL hosted |
| `/customers` | GET/POST | CRUD customers (sincronizar con tenants en Neon) |
| `/subscriptions` | GET/PATCH | Listar/modificar subs (upgrade, cancel) |
| `/products` | GET | Listar productos para mostrar en pricing page |
| `/events` (usage ingest) | POST | Reportar consumo medido (tokens, runs) |
| `/customer-portal/sessions` | POST | Generar URL del customer portal |

---

## Runbook (cuando ejecutemos M14)

1. Verificar las tres envs vía `getOperatorSecret`. Si falta alguna, abortar M14.
2. Crear `lib/forge/adapters/polar-billing.ts` implementando el contract. Capacidades: `["billing", "subscriptions", "usage-metering"]`. Anillo 2 default, 3 para refunds.
3. Métodos del adapter: `createCheckout(planId, tenantId)`, `getSubscription(tenantId)`, `reportUsage(tenantId, meter, value)`, `cancelSubscription(tenantId)` (Anillo 3).
4. Crear route `app/api/webhooks/polar/route.ts` que valide la firma con `POLAR_WEBHOOK_SECRET`, parsee el event, y actualice la tabla `subscriptions` en Neon (linkear con `tenants.id` via `customer_external_id`).
5. Crear página `/billing` con embed del customer portal de Polar (Polar genera el URL via SDK; redirect simple).
6. Agregar tool al cerebro en `lib/forge/tools.ts`: `billing_create_checkout(plan_id, user_id)` (Anillo 2 — humano confirma).
7. Wire usage reporting: cada `audit_event` con costo registra `polar.usage.ingest` async (vía Trigger.dev para no bloquear el run).
8. Test mínimo: crear un checkout sandbox, completarlo con tarjeta de prueba, verificar que el webhook llega y la row en `subscriptions` se crea.

---

## Caveats / notas operativas

- **Fee:** Polar cobra 4% + fees de Stripe (~2.9% + $0.30). Total ~7% efectivo. Considerar en el margen al pricing.
- **Webhook signature validation es OBLIGATORIA.** Sin validar firma, cualquiera puede llamar a `/api/webhooks/polar` con un payload falso y activar features. Usar `@polar-sh/sdk/webhooks` helper.
- **Customer external ID** es el pegamento entre Polar y nuestro modelo. Setearlo a `tenants.id` (UUID) al crear el customer; nunca cambiar.
- **Sandbox environment:** Polar tiene `sandbox.polar.sh` separado. Usar para development/preview; production solo cuando se vaya live.
- **Tax compliance:** Polar maneja VAT/IVA automáticamente si la dirección del business está bien configurada. Para clientes en EU/UK/MX se aplica el tax local.
- **Rotación de access token:** dashboard `/developers` → revoke + create. Webhook secret rota por separado en `/webhooks/{id}` → regenerate.
- **Vendor alternatives:** Stripe directo (ADR-006 lo descartó por DX), Lemon Squeezy (similar a Polar), Paddle (Merchant of Record más caro). Migrar a Stripe directo es ~2 semanas porque la data ya está allá under the hood.

---

## Estado de env vars en Vercel

```
POLAR_ACCESS_TOKEN       encrypted    PENDIENTE — agregar antes de M14
POLAR_ORGANIZATION_ID    plain        PENDIENTE — agregar antes de M14
POLAR_WEBHOOK_SECRET     encrypted    PENDIENTE — agregar antes de M14
```

---

## Referencias

- Docs: https://docs.polar.sh
- SDK: https://github.com/polarsource/polar-js
- Dashboard: https://polar.sh

# Integración: Clerk (Identity Provider centralizado)

> *Conexión de la instancia de Clerk (originalmente del proyecto VanDeFi) como Identity Provider compartido para vForge y futuros proyectos del portafolio. Patrón: una sola instancia de Clerk, múltiples dominios satélite.*

---

## Resumen

- **Provider:** [Clerk](https://clerk.com) — Auth as a Service
- **Instance ID:** `ins_38CW5LS8RmlKTkuTM1Cv8Z4Yc62`
- **Environment:** production
- **Frontend domain principal:** `clerk.vandefi.org` (codificado en pk via base64)
- **Usuarios existentes:** 14 (nacidos en VanDeFi, compartidos a todo el portafolio)
- **Implementado en:** vForge MVP · 2026-05-02

---

## Hallazgo importante: SSO portfolio activo

Decodificando la `pk_live_Y2xlcmsudmFuZGVmaS5vcmck` con base64 (segmento Y2xlcmsudmFuZGVmaS5vcmck → `clerk.vandefi.org`) descubrimos que la instancia de Clerk **ya existe** y vive bajo el dominio frontend `clerk.vandefi.org`.

Esto significa que vForge no nace con Clerk en vacío — **se conecta a la instancia existente de VanDeFi**. Cualquier usuario que ya esté registrado en VanDeFi (los 14 actuales, que incluyen `turbillon50@gmail.com`) podrá iniciar sesión en vForge cuando montemos `<ClerkProvider />`.

Este es exactamente el patrón **Centralized Identity Provider / SSO portfolio** que Luis planteó arquitectónicamente: *un signup, todas mis apps*. Sin trabajo extra — ya está configurado.

---

## Inputs requeridos del operador

```
CLERK_PK    pk_live_...   (publishable key, frontend-safe, embebe el dominio en base64)
CLERK_SK    sk_live_...   (secret key, server-side encrypted, NUNCA en cliente)
```

Ambas se obtienen de https://dashboard.clerk.com → API Keys.

---

## Endpoints usados (Clerk API v1, auth: Bearer sk_live_...)

| Endpoint | Método | Para qué |
|---|---|---|
| `/v1/instance` | GET | Verificar key + obtener instance metadata |
| `/v1/users/count` | GET | Sanity check del número de usuarios |
| `/v1/users?limit=N` | GET | Listar usuarios (server-only) |
| `/v1/domains` | POST | Agregar dominio satélite (futuro) |
| `/v1/sign_in_tokens` | POST | Generar tokens de magic-link |

---

## Runbook ejecutado

### Paso 1 — Stash y verificación

```bash
umask 077
cat > /tmp/.clerk-env <<EOF
export CLERK_PK='pk_live_...'
export CLERK_SK='sk_live_...'
EOF
chmod 600 /tmp/.clerk-env

curl -s -H "Authorization: Bearer $CLERK_SK" "https://api.clerk.com/v1/instance"
# → environment_type: production, ✓
```

### Paso 2 — Configurar Vercel env vars

```bash
# Publishable key — plain (es frontend-safe; el prefijo NEXT_PUBLIC_ la expone al cliente)
curl -X POST .../env -d '{
  "key": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "value": "<pk_live_...>",
  "type": "plain",
  "target": ["production", "preview", "development"]
}'

# Secret key — encrypted (backend only, jamás expuesta al cliente)
curl -X POST .../env -d '{
  "key": "CLERK_SECRET_KEY",
  "value": "<sk_live_...>",
  "type": "encrypted",
  "target": ["production", "preview", "development"]
}'
```

### Paso 3 — Cleanup

```bash
rm -f /tmp/.clerk-env
```

---

## ⚠️ Acción pendiente del operador (Anillo 2)

Antes de que vForge use Clerk en producción, hay que **agregar `vforge.site` como dominio satélite** en el dashboard de Clerk. Sin esto, los redirects de sign-in fallan con `unauthorized_domain`.

**Pasos en https://dashboard.clerk.com:**

1. Selecciona la instancia (la que tiene `clerk.vandefi.org` como frontend principal).
2. Settings → Domains → **`+ Add satellite domain`**.
3. Domain: `vforge.site`
4. Redirect URL: `https://vforge.site/sign-in/sso-callback`
5. Save.

Luego repetir para cualquier otro proyecto del portafolio que quiera SSO compartido (Castores, Jobber, etc.).

**Cuando llegue M0 + Clerk integration**, vForge usará:

```ts
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      // Marca esta app como satélite del IdP principal
      isSatellite
      domain="vforge.site"
    >
      {/* ... */}
    </ClerkProvider>
  );
}
```

---

## Schema implícito (cuando llegue M0)

Clerk maneja su propia DB de usuarios — no toca la nuestra de Neon directamente. El cruce se hace via `user_id` de Clerk:

```sql
-- Tabla en Neon (M0)
CREATE TABLE users (
  id            text PRIMARY KEY,        -- = user_id de Clerk (formato user_xxx)
  clerk_email   text NOT NULL,
  role          text NOT NULL DEFAULT 'operator',  -- operator | admin | client
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

Webhook de Clerk → `/api/webhooks/clerk` → upsert al sync user creation.

---

## Caveats observados

1. **OCR alucinado.** Cuando Luis envió las keys vía screenshot, el OCR insertó un `-` en `cMpiK-xia1` (real: `cMpiKxia1`) y leyó `i` como `m` en la pk. Resultado: ambas keys rechazadas con `clerk_key_invalid`. Solución: **siempre pasar credenciales como texto, no foto**, o rotarlas y reenviar.
2. **`allowed_origins: null`.** La instancia no tiene origins explícitamente whitelisted. Bueno para flexibilidad, pero hay que agregar `vforge.site` como satellite domain antes de producción.
3. **`home_origin: None`** en la respuesta del `/v1/instance` — el dominio principal está embebido en el pk, no devuelto explícitamente. Para verificar, decodificar base64 del pk.
4. **14 usuarios ya existen.** Cuando el frontend monte Clerk, esos 14 podrán intentar login en vForge. Hay que decidir el modelo: ¿todos pueden? ¿solo `role='operator'`? ¿allowlist por email? Esto se diseña en M0.
5. **Production keys = production users.** Estas son `pk_live_` / `sk_live_`, así que cualquier action es real. No hay sandbox.

---

## Estado actual de env vars en Vercel

```
NEXT_PUBLIC_SITE_URL              plain      https://vforge.site
DATABASE_URL                      encrypted  postgres://... (Neon)
NEON_API_KEY                      encrypted
NEON_ORG_ID                       plain
NEON_PROJECT_ID                   plain
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY plain      pk_live_... (vandefi.org)
CLERK_SECRET_KEY                  encrypted  sk_live_...
```

Total: **7 variables de entorno cableadas**. Faltan solamente las API keys de modelos (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) cuando el operador las pase.

---

## Cuando Forge AI lo ejecute (M5+)

Adapter `lib/forge/adapters/clerk.ts`:

```ts
type ClerkAdapter = {
  verifySession(sessionToken: string): Promise<{ userId: string; email: string } | null>;
  getUser(userId: string): Promise<ClerkUser>;
  addSatelliteDomain(domain: string): Promise<void>;
  generateMagicLink(email: string, redirectUrl: string): Promise<string>;
};
```

Cualquier acción de Anillo 2/3 valida el session token de Clerk antes de proceder. El audit log incluye `clerk_user_id` para trazabilidad.

---

## Referencias

- Clerk Backend API: https://clerk.com/docs/reference/backend-api
- Satellite domains: https://clerk.com/docs/advanced-usage/satellite-domains
- Next.js integration: https://clerk.com/docs/quickstarts/nextjs
- Webhooks: https://clerk.com/docs/integrations/webhooks

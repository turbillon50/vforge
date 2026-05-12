# Integración: Resend (email transaccional dominio propio)

> *Entra en M9.5 (Fase 1). Email transaccional con `noreply@vforge.site`: confirmaciones Ring 2/3 cuando el operador no está mirando el chat, recaps diarios, alerts de deploys fallidos a las 3 AM. ADR-009 lo eligió sobre SendGrid/Postmark por DX TS-first + React Email para templates.*

---

## Resumen

- **Provider:** [Resend](https://resend.com) — email transaccional con DX de developer, React Email nativo
- **Rol en vForge:** entrega de emails desde `@vforge.site` para confirmaciones de Anillo 2/3 fuera del chat, recaps diarios de actividad de Forge, alerts cuando un deploy de Vercel falla, magic links si llegan en Fase 2.
- **Milestone:** M9.5 — Fase 1 (opcional pero recomendado)
- **Anillo:** 1 (envío de email; no acción destructiva)
- **Adapter file (futuro):** `lib/forge/adapters/resend-email.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
RESEND_API_KEY         re_...                   key del dashboard, server-side encrypted
RESEND_FROM_ADDRESS    noreply@vforge.site      address verificada en Resend con DNS propios
```

Dos variables. `RESEND_FROM_ADDRESS` es plain (no sensible, pero útil para no hardcodear el address en código).

---

## Cuenta y onboarding

1. Ir a https://resend.com/signup — registrarse con GitHub OAuth o email.
2. En el dashboard, ir a Domains → "Add Domain" → ingresar `vforge.site`.
3. Resend muestra los DNS records requeridos: 1 MX, 1 SPF (TXT), 1 DKIM (TXT), 1 DMARC (TXT). Copiar los valores exactos.
4. Agregar esos records al dominio `vforge.site` vía la **tool `namecom_dns_record_create`** (Name.com es el registrar; ver `docs/integrations/name-com.md`). Crear 4 records, esperar propagación 5-30 min.
5. Volver al dashboard de Resend → "Verify DNS Records". Status pasa a `verified`. Sin esto, todos los emails van a spam o son rechazados.
6. Generar key en https://resend.com/api-keys → "Create API Key" → permission `Full access` (para Fase 1; restringir a `Sending access` después). Copiar el `re_...`.
7. Agregar `RESEND_API_KEY` (encrypted) y `RESEND_FROM_ADDRESS` (plain, valor `noreply@vforge.site`) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Resend se usa via SDK TypeScript oficial. Templates con React Email para HTML; texto plano para alerts simples.

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.RESEND_FROM_ADDRESS!,
  to: ["turbillon50@gmail.com"],
  subject: "vForge: deploy listo",
  html: "<p>El deploy de <strong>vforge.site</strong> terminó OK.</p>",
  // o reemplazar `html` con `react: <DeployDoneEmail url={url} />` para templates JSX
});
```

Endpoints relevantes (bajo `https://api.resend.com`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/emails` | POST | Enviar un email |
| `/emails/{id}` | GET | Estado de un envío (delivered, bounced, complained) |
| `/domains/{id}` | GET | Verificar status DNS del dominio |
| `/api-keys` | GET/POST | Gestionar keys (rotación) |

---

## Runbook (cuando ejecutemos M9.5)

1. Verificar `RESEND_API_KEY` y `RESEND_FROM_ADDRESS` vía `getOperatorSecret`. Si falta cualquiera, marcar M9.5 como skipped y continuar.
2. Verificar status del dominio vía `GET /domains/{id}` — si no está `verified`, abortar con mensaje claro al operador (los DNS no propagaron o están mal).
3. Crear `lib/forge/adapters/resend-email.ts` implementando el contract: capacidades `["email-send"]`. Anillo 1. Método `send({ to, subject, html?, react?, text? })`.
4. Crear `emails/` en la raíz con templates React Email:
   - `DeployDone.tsx` — confirmación de deploy exitoso.
   - `DeployFailed.tsx` — alert con stack trace.
   - `Ring2Confirmation.tsx` — magic-link-style "Approve / Reject" para acciones de Anillo 2 cuando el operador no está en el chat.
   - `DailyRecap.tsx` — resumen de actividad de Forge (runs ejecutados, costo, errores).
5. Agregar tool al cerebro en `lib/forge/tools.ts`: `email_send(to, subject, body)`. Anillo 1.
6. Wire el cron de Trigger.dev (M9) para el daily recap: scheduled task que corre 8 AM CDMX, agrega audit events del día, dispara `email_send`.
7. Test mínimo: enviar un email a `turbillon50@gmail.com` desde un endpoint admin, verificar delivery en el dashboard de Resend.

---

## Caveats / notas operativas

- **DNS es prerequisito.** Sin DKIM + SPF + DMARC verificados, Gmail/Outlook marcan como spam o rechazan. Esta es la parte tardada (propagación 5-30 min).
- **DMARC `p=none` para empezar.** Subir a `p=quarantine` después de 1 semana de logs limpios; a `p=reject` después de 1 mes. Resend documenta el upgrade path.
- **Free tier:** 3K emails/mes, 100/día. Suficiente para Fase 1 (Luis solo). En Fase 2 evaluar plan paid.
- **Bounces y complaints** llegan via webhooks (no implementados en M9.5; agregar en Fase 2 si el volumen lo justifica). Por ahora consultar `GET /emails/{id}` para spot checks.
- **Rotación de key:** dashboard `/api-keys` → revoke + create new. Redeploy de Vercel.
- **Vendor alternatives:** Postmark, SendGrid, SES. Migrar implica reescribir el adapter (~30 min) y re-verificar DNS en el nuevo proveedor (~1h).

---

## Estado de env vars en Vercel

```
RESEND_API_KEY         encrypted    PENDIENTE — agregar antes de M9.5
RESEND_FROM_ADDRESS    plain        PENDIENTE — agregar antes de M9.5 (valor: noreply@vforge.site)
```

DNS records en Name.com:

```
TXT @                  v=spf1 include:_spf.resend.com ~all          PENDIENTE
TXT resend._domainkey  k=rsa; p=...                                  PENDIENTE
TXT _dmarc             v=DMARC1; p=none; rua=mailto:...              PENDIENTE
MX  send               feedback-smtp.us-east-1.amazonses.com (10)    PENDIENTE
```

---

## Referencias

- Docs: https://resend.com/docs
- SDK: https://github.com/resend/resend-node
- React Email: https://react.email
- Dashboard: https://resend.com/overview

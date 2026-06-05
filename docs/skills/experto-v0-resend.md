# Dossier experto: v0 Platform API (Vercel) + Resend
Fecha: 2026-06-04 · Fuentes: docs oficiales v0.app/docs/api/platform, resend.com/docs

---

## A) v0 de Vercel — Platform API

### Qué es
API REST (`https://api.v0.dev`) + SDK TypeScript (`npm i v0-sdk`) que expone todo lo que hace v0.app: generación de UI/apps full-stack por lenguaje natural, gestión de chats/proyectos y deployments — programáticamente, sin tocar la web. Auth por API key (`V0_API_KEY`, se crea en v0.app/chat/settings/keys). Cliente default `import { v0 } from 'v0-sdk'` o `createClient({ apiKey, baseUrl })` para multi-cuenta/enterprise.

### Generación de UI por API
- `v0.chats.create({ initialMessage })` — genera desde cero con IA (consume tokens/créditos).
- `v0.chats.init({ type: 'files'|'repo', files | repo })` — arranca desde código existente o repo GitHub (rápido, **no consume tokens**).
- Conversación multi-turno: `POST /v1/chats/:id/messages` para iterar ("hazlo dark mode", "agrega checkout"). Cada respuesta produce una **versión** con archivos y preview en vivo (demo URL).
- Acepta texto, screenshots/archivos adjuntos, imports de Figma; salida React/Next.js (también Vue, etc.) con shadcn/Tailwind.
- Guías clave: lock de archivos contra cambios de la IA, OAuth MCP servers, mostrar mensajes de chat en tu propia UI (paquete `@v0-sdk/react` para renderizar streams).

### Proyectos y chats programáticos
- `v0.projects.create/find/update/delete` — contenedores de trabajo; un proyecto agrupa chats, env vars y deployments. Se pueden vincular a proyectos Vercel reales.
- Chats: hasta 10,000 mensajes/chat, 1,000 archivos/chat (3MB máx por archivo).
- Import desde GitHub, upload de archivos, templates de comunidad; export para backup.
- Webhooks de v0 (eventos de chat/versión) y `@v0-sdk/ai-tools` para que agentes (AI SDK) usen v0 como herramienta autónoma: "crea y despliega un dashboard" en un solo prompt.

### Deployments
- `v0.deployments.create({ chatId, versionId })` — publica una versión a hosting de Vercel con SSL, dominios custom, logs (`deployments.findLogs`), errores (`findErrors`), y entornos (staging/prod). Integración nativa con cuenta Vercel del equipo.

### Modelos v0 (Model API, compatible OpenAI)
- `v0-1.5-md` — default, plan Free+; ~$3/M input, $15/M output. Especializado en código web/Next.js, soporta multimodal (imágenes), function calling, contexto grande.
- `v0-1.5-lg` — Pro/Team; mayor calidad para UIs complejas (hasta ~$75/M output). También disponible vía Vercel AI Gateway.
- (Legacy: v0-1.0-md). Los modelos "piensan" con conocimiento actualizado de frameworks y auto-fix de errores comunes.

### Límites y costos
- Cuotas API: 10,000 requests/día, 1,000 mensajes de chat/día, **100 deployments/día**, 1GB uploads/día, 50 imports GitHub/día.
- Planes (facturación por créditos de uso de modelo): Free $0 (~$5 créditos/mes), Premium $20/mes ($20 créditos, Figma import), Team $30/usuario/mes (workspace compartido, créditos compartidos), Business $100/usuario, Enterprise custom (SSO, base URL dedicada, SLA). Créditos extra on-demand.
- Costo real por generación: una UI mediana suele costar centavos–pocos dólares en tokens según complejidad e iteraciones.
- Privacidad: tu código no se usa para entrenar; cifrado en tránsito/reposo.

### 5 recomendaciones para VForge
1. **Pipeline demo-factory con `chats.create` + `deployments.create`**: un endpoint interno que recibe brief del cliente → genera chat v0 → despliega → devuelve URL de demo en minutos. Guardar `chatId`/`versionId` en Neon para iterar después sin regenerar.
2. **Usa `chats.init()` con tu boilerplate VForge** (PWA demo, toggle público/usuario/admin, datos seed) en vez de `create()` desde cero: ahorra tokens, garantiza consistencia de marca, y la IA solo personaliza encima.
3. **Cuida la cuota de 100 deployments/día y créditos**: cola con rate-limit + retry exponencial; despliega solo la versión aprobada, usa el preview URL del chat (gratis) para revisiones intermedias.
4. **Iteración con el cliente vía mensajes programáticos**: expón en tu panel VForge un textarea "pide cambios" que haga `POST messages` al chat existente — el cliente ve la demo evolucionar en vivo sin que tú toques código; usa lock de archivos para proteger layout base.
5. **Plan Team + `@v0-sdk/ai-tools`**: créditos compartidos entre tus agentes, y un agente orquestador (AI SDK) que decida modelo (`v0-1.5-md` para demos rápidas, `lg` solo para demos premium de venta grande) — controla costo por demo (~target <$1 c/u).

---

## B) Resend

### Qué es
API de email para developers (SDKs Node, Python, PHP/Laravel, Go, Ruby/Rails, Rust, Elixir, Java, .NET, CLI). Auth con key `re_...`. Pilares: Emails transaccionales, Domains, Broadcasts/Audiences, Webhooks, Inbound, Templates.

### Emails transaccionales
- `resend.emails.send({ from, to, subject, html|react|text, attachments, tags, headers, scheduledAt })`.
- Soporta **batch** (hasta 100 emails/request), **scheduling** (`scheduledAt` lenguaje natural o ISO), idempotency keys, reply_to, cc/bcc, tags para filtrar eventos.
- Endpoints de gestión: get/update/cancel email programado, listar actividad en dashboard.

### Dominios
- `resend.domains.create({ name, region })` → devuelve registros DNS (SPF/DKIM TXT, MX para retorno) → `verify`. Regiones: us-east-1, eu-west-1, sa-east-1, ap-northeast-1.
- Soporta dominios y subdominios dedicados (recomendado: `notif.cliente.com`), tracking de clicks/opens configurable por dominio, custom return-path, DMARC recomendado. IPs dedicadas en planes altos.

### react-email templates
- Librería open-source `@react-email/components` (Html, Button, Section, Tailwind, etc.): escribes emails como componentes React, con preview local (`email dev`) y compatibilidad probada entre clientes (Outlook, Gmail…).
- Con SDK Node pasas `react: <MiTemplate {...props} />` directo a `emails.send`. También hay Templates alojados en Resend (template_id) y plantillas pre-hechas.

### Broadcasts y Audiencias
- **Audiences**: listas de contactos (`contacts.create/update/remove`, campos first/last name, unsubscribed). Manejo automático de unsubscribe (header List-Unsubscribe y página alojada).
- **Broadcasts**: campañas de marketing a una audiencia — creables por API (`broadcasts.create/send`, con `scheduledAt`) o editor visual del dashboard. Analytics de opens/clicks. Facturación marketing separada: por nº de contactos (incluye 1,000 contactos gratis).

### Webhooks de entrega
- Eventos: `email.sent`, `.delivered`, `.delivery_delayed`, `.bounced` (con type/subType), `.complained`, `.opened`, `.clicked`, `.failed`, más `contact.*`, `domain.*`, `inbound.*`.
- Firmados con Svix (`svix-id`, verificación de firma con signing secret). Entrega at-least-once (deduplicar por svix-id), orden no garantizado (ordenar por `created_at`).
- Retries automáticos: 5s, 5m, 30m, 2h, 5h, 10h; replay manual de eventos (incluso exitosos) desde dashboard. CLI `resend webhooks listen` para dev local. Webhooks gestionables por API.

### Inbound
- Recibe emails en tu dominio: configuras MX → Resend entrega cada email entrante como webhook `inbound.email.received` con JSON parseado (from, to, subject, html/text, attachments descargables por API). Útil para reply-to procesable, soporte, comandos por email.

### Precios
- Free: 3,000 emails/mes (100/día), 1 dominio, webhooks, audiences, react-email incluidos.
- Pro $20/mes (50k emails), Scale desde $90 (100k) hasta ~$1,150 (2.5M), Enterprise custom (IP dedicada, SLA). Marketing (broadcasts) se cobra aparte por contactos.

### 5 recomendaciones para VForge
1. **Onboarding automatizado**: al generar una demo, dispara react-email de bienvenida con el link de la demo (v0 deployment URL), credenciales demo y CTA de agenda — un template `DemoReady.tsx` parametrizado por cliente, enviado vía `emails.send({ react })`.
2. **Notificaciones de aprobación con Inbound**: envía la demo desde `aprobar@vforge.app`; si el cliente responde "apruebo", el webhook `inbound.email.received` dispara el pipeline de producción (deploy final, factura). Cero fricción: el cliente aprueba contestando el correo.
3. **Recibos y facturación**: template react-email de recibo (Stripe/Mercado Pago webhook → Resend), con tags `{type:'receipt', client_id}` para auditar entregas; usa idempotency keys para no duplicar recibos en retries.
4. **Subdominio dedicado + webhooks de salud**: envía desde `mail.vforge.app` (no el dominio raíz), verifica SPF/DKIM/DMARC, y consume `email.bounced`/`.complained` para suprimir contactos automáticamente en Neon — protege reputación cuando escales a decenas de clientes.
5. **Broadcasts para nurturing**: audiencia "prospectos con demo entregada"; broadcast semanal programado (casos de éxito, nuevas features) con unsubscribe automático. Empieza en Free (3k/mes alcanza para fase actual) y sube a Pro $20 al pasar ~100 emails/día.

---

### Sinergia v0 + Resend en VForge
Brief → v0 `chats.create` → deploy → Resend onboarding email con URL → cliente pide cambios (panel o reply inbound) → v0 `messages` itera → aprobación por email → deploy final + recibo Resend. Todo orquestable desde un solo worker con dos API keys.

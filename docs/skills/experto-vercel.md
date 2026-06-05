# Dossier Experto: Capacidades de Vercel (junio 2026)
Fuentes: docs oficiales vercel.com/docs (verificadas 2026-06-04: /docs/multi-tenant, /docs/multi-tenant/limits, /docs/multi-tenant/domain-management, /docs/limits actualizado 2026-05-20).

## 1. Mapa completo de capacidades

### 1.1 REST API y SDK
- Base: `https://api.vercel.com`, auth con Bearer token (token personal o de equipo; scope por team con `?teamId=`). Todo lo del dashboard es automatizable: proyectos, deployments, dominios, env vars, equipos, certs, firewall, drains, Edge Config, stores.
- SDK oficial TypeScript `@vercel/sdk` (funciones tree-shakeable tipo `projectsAddProjectDomain`, `deploymentsCreateDeployment`). Es la vía recomendada hoy sobre fetch crudo.
- Endpoints clave: `POST /v11/projects` (crear proyecto, conectar repo Git con `gitRepository`), `POST /v13/deployments` (deploy por archivos o por ref de Git), `POST /v10/projects/{id}/env` (env vars por entorno, tipo `encrypted`/`sensitive`), `GET /v6/deployments`, `GET /v3/deployments/{id}/events` (build logs).
- También existe **Vercel MCP server** oficial y CLI (`vercel`) scriptable con `--token`.

### 1.2 Deploy Hooks y Webhooks
- **Deploy hooks**: URL única por proyecto+rama; un POST dispara redeploy del último commit. Sin auth en la URL (tratarla como secreto). Límite: **60 triggers/hora por owner**.
- **Webhooks salientes** (Pro/Enterprise, o vía integraciones): eventos `deployment.created`, `deployment.succeeded`, `deployment.error`, `project.created`, `domain.created`, firewall attack, etc., firmados con `x-vercel-signature` (HMAC-SHA1 del body).

### 1.3 Dominios programáticos + wildcard multi-tenant (Vercel for Platforms)
- Modelo recomendado: **un solo proyecto/codebase sirve N tenants** (middleware lee el `Host` y enruta). Casos reales: Hashnode, Dub, Mintlify, Cal.com, Zapier Interfaces.
- Wildcard `*.acme.com`: requiere apuntar el apex a **nameservers de Vercel** (`ns1/ns2.vercel-dns.com`); con eso, cualquier `tenant.acme.com` resuelve al instante sin llamada API por subdominio, y Vercel emite cert SSL individual on-the-fly.
- Dominio custom del cliente: `projectsAddProjectDomain` → si el dominio ya existe en otra cuenta Vercel, exige TXT de verificación (`projectsVerifyProjectDomain` para chequear/disparar). SSL automático tras verificar. Quitar: `projectsRemoveProjectDomain` + `domainsDeleteDomain`.
- Redirects www→apex configurables vía API (`redirect` en el domain object). También hay API de **compra de dominios** (registrar) y gestión de registros DNS (`POST /v2/domains/{domain}/records`).
- Límites: Hobby 50 dominios/proyecto; Pro/Enterprise "ilimitado" con soft limit de **100k (Pro) / 1M (Enterprise) dominios por proyecto**. Preview URLs multi-tenant (`tenant---proyecto-git-rama.dominio.dev`) y certs SSL propios: **solo Enterprise**.

### 1.4 Middleware (Edge / Routing Middleware)
- `middleware.ts` corre antes del cache/CDN en toda request: rewrite por hostname (clave multi-tenant), auth, A/B, geolocalización (`request.geo`), headers, feature flags con **Edge Config** (lecturas ~ms, ideal para mapa tenant→config sin tocar DB).
- Runtime ligero (edge runtime; ya soporta Node.js runtime en middleware con Fluid). Sin WebSocket server en funciones.

### 1.5 Cron Jobs
- Declarados en `vercel.json` (`{"crons":[{"path":"/api/sync","schedule":"0 5 * * *"}]}`); invocan una función vía GET. Hasta **100 crons por proyecto** en todos los planes; Hobby con precisión limitada (ventana de ~1h, máx. 2 crons efectivos prácticos según pricing), Pro precisión por minuto. Protegerlos con `CRON_SECRET`. Complementos nuevos: **Vercel Queues** y **Workflows** (orquestación durable con pricing por evento, $0.02/1K eventos).

### 1.6 Storage
- **Vercel Blob**: objetos (imágenes, archivos), SDK `@vercel/blob`, URLs públicas/privadas, multipart, 5GB incluidos en Pro; rate limits de operaciones por minuto según plan.
- **Postgres**: ya no es producto propio — se ofrece vía **Marketplace (Neon, Supabase, etc.)**, facturación unificada en Vercel, provisioning programático vía API de integraciones/stores (`Postgres stores create`).
- **Edge Config**: KV ultrarrápido de lectura global para config/flags (escrituras limitadas: 480/día Pro, 250/mes Hobby — NO es base de datos).
- **KV estilo Redis**: vía Marketplace (Upstash). **Vercel Queues** para colas.

### 1.7 Observabilidad y Logs
- Build logs: persistentes. **Runtime logs: 1h Hobby / 1 día Pro / 3 días Enterprise** — para retención real usar **Log Drains** ($0.50/GB) hacia Datadog, Axiom, Better Stack o endpoint propio.
- API: `GET /v3/deployments/{id}/events` (build), endpoint de runtime logs (rate limit 100/min), Request Logs 240/min. Observability/Observability Plus: métricas por ruta, $1.20/1M eventos. OpenTelemetry traces vía drains/integraciones. Web Analytics y Speed Insights con pricing propio.

### 1.8 Preview Deployments y Comments
- Cada push a rama = preview URL inmutable + alias por rama. **Toolbar de comentarios** en previews (threads, screenshots, integración Slack/Linear/Jira), gestionable vía API/MCP (list/reply/resolve threads). Deployment Protection (password, Vercel Auth, trusted IPs) con **Protection Bypass for Automation** (token para E2E).

### 1.9 Firewall / WAF
- Incluido en todos los planes: DDoS automático L3/L4/L7, **WAF con custom rules** (por path, header, geo, ASN, JA4), **managed rulesets OWASP CRS** (Pro/Ent, pago por request), **Rate Limiting** programable (1M requests permitidos incluidos Pro), IP blocking/bypass vía API, Challenge mode, Attack Challenge Mode de emergencia. Reglas configurables como código (`@vercel/firewall`) y por API.

### 1.10 AI SDK y AI Gateway
- **AI SDK** (`ai` npm, v5/v6): abstracción TS para streaming, tool calling, structured output, agents sobre cualquier proveedor (OpenAI, Anthropic, Google, etc.). `useChat`/`streamText`; estándar de facto en Next.js.
- **AI Gateway**: un endpoint/una API key para cientos de modelos, failover automático entre proveedores, métricas de costo/latencia, BYOK, sin markup sobre precio de proveedor. Ideal para no casarse con un proveedor.
- Extras: **Vercel Sandbox** (ejecutar código no confiable generado por IA), **Vercel Agent/Vade** (code review IA y automatizaciones, visible en rate limits), `x-vercel-ai` bot protection en firewall.

### 1.11 v0 Platform API
- API (`v0-sdk` / api.v0.dev) para usar v0 como motor de generación de UI: crear chats programáticamente, enviar prompts, obtener código/preview, iterar versiones y desplegar a Vercel. Modelos `v0-1.5-md/lg`. Permite construir tu propio "generador de apps" white-label sobre v0. Requiere plan Premium/Team de v0 con créditos por uso.

## 2. Diez recomendaciones concretas para VForge

1. **Un proyecto multi-tenant, no un proyecto por cliente.** Arquitectura "Platforms": una sola app Next.js sirve a todos los clientes vía `middleware.ts` que mapea hostname→tenant. Evita los límites de deployments/día, builds concurrentes y mantenimiento N×.
2. **Wildcard `*.vforge.app` desde el día 1.** Apunta el apex a ns1/ns2.vercel-dns.com y agrega `*.vforge.app` al proyecto. Alta de cliente nuevo = un INSERT en tu DB; cero llamadas a la API de Vercel, subdominio activo al instante con SSL.
3. **Dominios custom de cliente vía `@vercel/sdk`** en el flujo de onboarding: `projectsAddProjectDomain` + polling de `projectsVerifyProjectDomain` + UI que muestre al cliente el TXT/CNAME pendiente. Respeta el rate limit de 100 altas de dominio/min y 120 creaciones de dominio/hora.
4. **Edge Config como mapa tenant→config** (tema, plan, feature flags, dominio canónico): lectura en middleware sin latencia de DB. Ojo: 480 escrituras/día en Pro — escribe solo en cambios de config, no por request; datos vivos van a Neon.
5. **Para clientes que sí necesiten app dedicada** (código distinto, no plantilla): provisiona vía API `POST /v11/projects` con `gitRepository` apuntando a un monorepo/template + `POST .../env` para sus secrets + deploy hook por cliente. Guarda `projectId` y `deployHookUrl` en tu tabla de clientes.
6. **Plan Pro obligatorio + team único.** Hobby prohíbe repos de organizaciones Git, limita a 50 dominios/proyecto y 100 deploys/día. Pro da 6,000 deploys/día, dominios ilimitados (soft 100k) y 12 builds concurrentes.
7. **Log Drains a Axiom/Better Stack desde el inicio.** Con 1 día de retención en Pro, sin drain no podrás depurar incidentes de clientes reportados "ayer". $0.50/GB es barato comparado con perder evidencia.
8. **WAF + Rate Limiting por tenant**: reglas de firewall por hostname/path para que un cliente atacado no queme la cuota de todos; activa Attack Challenge Mode runbook. Las reglas se versionan vía API (`Project Routes/Bulk Redirect` endpoints).
9. **Pipeline de generación con v0 Platform API + AI Gateway**: VForge genera la UI inicial del cliente con v0 (API, no manual), y todas las features IA de las apps cliente pasan por AI Gateway con una sola key y failover — un solo punto de control de costos por tenant.
10. **Webhooks + Checks para el panel VForge**: suscríbete a `deployment.succeeded/error` y `domain.created` para reflejar estado en tu dashboard de clientes en tiempo real; usa Protection Bypass token para correr smoke tests E2E contra cada preview antes de promover a producción.

## 3. Trampas y límites de planes

- **Runtime logs efímeros**: 1h Hobby / 1 día Pro. La trampa #1 en producción. Solución: drains.
- **Wildcard exige nameservers de Vercel**: si el cliente no puede delegar NS del apex (p. ej. dominio corporativo), no hay wildcard SSL para ese dominio — solo dominios/CNAME individuales.
- **Preview URLs multi-tenant y certs SSL propios: solo Enterprise.** En Pro no puedes dar previews por tenant con su dominio.
- **Hobby ≠ comercial**: prohibido uso comercial, sin repos de org Git, 100 deploys/día, 1 build concurrente, funciones 60s máx, 200 proyectos.
- **Rate limits de API que muerden a una fábrica**: 120 dominios creados/hora, 100 project-domain ops/min, 60 deploy-hook triggers/hora, 32 tokens creados/hora, 450 deploys/hora en Pro. Implementa cola con backoff en el provisioner.
- **Edge Config no es KV de escritura**: 480 writes/día (Pro). Para datos mutables usa Redis/Neon.
- **Sin WebSockets como servidor** en funciones; usar Pusher/Ably/PartyKit o el patrón de streaming.
- **Timeouts**: proxied/rewrite externo 120s duro; funciones legacy sin Fluid 300s máx Pro (900s Ent); build 45 min máx.
- **Costos variables sorpresa en Pro**: el plan es crédito incluido + on-demand (Fast Data Transfer regional tras 1TB, invocaciones $0.60/M, edge requests tras 10M, image optimization, analytics $3/100K eventos). Un cliente viral puede generar factura grande — configura **Spend Management** con pausa automática y/o webhooks de presupuesto.
- **Verificación de dominios "olvidada"**: si el dominio existía en otra cuenta Vercel y nadie pone el TXT, no hay SSL y el sitio del cliente queda caído en silencio. Monitorea `verified:false` en tu provisioner.
- **Env vars**: máx 64KB totales por deployment y 1000 por entorno; deletions limitadas a 60/min — no metas secrets por tenant como env vars, van en DB/Edge Config.
- **DNS 24–48h de propagación** al cambiar nameservers: avísalo en el onboarding del cliente.
- **Label DNS de 63 caracteres**: subdominios de tenant + ramas largas rompen preview URLs.
- **Postgres/KV ya no son productos nativos**: son Marketplace (Neon/Upstash); facturas vía Vercel pero límites y SLAs son del partner.

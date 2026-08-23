# VForge — Manual / README completo

**Dominio:** https://vforge.site · **Stack:** Next.js 16.2.4 (App Router, React 19) · Clerk (auth) · Neon Postgres · Vercel (deploy) · Tailwind 3 · framer-motion · MCP (mcp-handler).
**Tema visual:** sistema propio blanco y negro, mobile-first, con estudio del owner y salas privadas por proyecto.
**Última verificación:** 2026-06-10 — deploy READY, alias vforge.site, consola y red **limpias** en todas las rutas (0 errores).

---

## 1. Qué es VForge

VForge es "la fábrica de apps con IA": dos piezas en un sistema —
1. **VForge (la plataforma/forja):** despliega tu producto (proyectos, integraciones, deploys, secretos, marketplace).
2. **Vulcano / V (el copiloto):** la IA que construye contigo, con memoria persistente y conocimiento de los proyectos.

---

## 2. Roles y cómo se decide quién es quién

La autorización vive en `middleware.ts` + `lib/auth/owner.ts`. Hay tres formas de identidad:

### a) Owner (Luis) — acceso total
Un usuario es **owner** únicamente si alguno de sus emails está en
`VFORGE_OWNER_EMAILS` (CSV en env). Default:
`turbillon50@gmail.com, jaime@vmomentums.info`. La metadata de Clerk nunca
eleva permisos; las cuentas secundarias sólo ven proyectos donde tienen una
membresía activa.

El owner ve todo el cockpit `/app/*`, la V (`/forge`, `/v`) y todos los endpoints owner-only.

### b) Usuario registrado NO-owner — su propio workspace
Cualquier persona que se registra con Clerk y **no** es owner. Al intentar entrar a una ruta owner-only es redirigida automáticamente a **`/workspace`** (su espacio propio). El catálogo sólo incluye proyectos ligados a su correo por una membresía activa; no ve los datos privados de la V ni el cockpit de Luis.

### c) Operator token — para CLI / curl del owner
Endpoints `/api/admin/*` aceptan además un **Bearer token** (`VFORGE_OPERATOR_TOKEN`) con comparación de tiempo constante en el edge. Sirve para automatización (migraciones, seed, health) sin sesión de navegador.

> **Mapa a Owner/Associate/Client:** Owner = Luis (cockpit completo). Associate = usuario registrado operando en su `/workspace`. Client = visitante público (landing/marketing/marketplace, sin sesión).

---

## 3. Cómo se registran los usuarios

- **Registro / login:** Clerk, con páginas **propias** dentro del dominio: `/sign-up` y `/sign-in` (catch-all `[[...sign-in]]`). `signInUrl="/sign-in"`, `signUpUrl="/sign-up"` — nunca manda al Account Portal externo.
- Tras registrarse, un usuario normal cae en `/onboarding` → `/workspace`.
- El owner entra directo a `/app` (cockpit) y a la V.
- **Protección de sesión:** middleware Clerk. Rutas protegidas: `/app/*`, `/forge`, `/v`, `/workspace`, y las APIs `/api/{connect,integrations,cockpit,projects,graph,github,stats,forge,builder,vault,admin,workspace,billing,v/bridge,v/chat}`. Sin sesión: las páginas redirigen a `/sign-in`; las APIs responden `401` JSON. No-owner en ruta owner-only: páginas → `/workspace`, APIs → `403`.

---

## 4. Módulos

### Público (Client / sin sesión)
| Ruta | Qué hace |
|---|---|
| `/` | Landing: hero "Construye. Despliega. Domina.", carrusel de productos, integraciones, método, CTA. |
| `/pricing` | Planes y precios. |
| `/marketplace` | Marketplace público de apps/plantillas. |
| `/developers` | Portal de desarrolladores. |
| `/glossary` | Glosario del método vForge. |
| `/blog`, `/blog/[slug]` | Blog. |
| `/status` | Estado del sistema (día/noche). |
| `/mcp` | Página del servidor MCP (cómo conectarse). |
| `/vulcano` | Navegador Vulcano (IA + relevo humano). |
| `/docs`, `/terminos`, `/privacidad`, `/support`, `/billing` (legal) | Legales y soporte. |

### Cockpit del Owner (`/app/*`)
`home` (panel), `projects` (34 proyectos), `marketplace` (interno), `integrations` (conectores), `admin` + `admin/billing`, `chat`, `cockpit`, `contracts`, `deployments`, `secrets`, `settings`, `activity`, `blueprint`, `repovision`.

### Copiloto V
`/forge` — chat completo de V con memoria, scope general o por proyecto, herramientas (GitHub, etc.). `/v` — chat ligero contra `/api/v/chat`.

### Workspace (Associate)
`/workspace` y `/workspace/setup` — espacio del usuario registrado no-owner.

### APIs principales
Auth/OAuth (`/api/oauth/*`, `/api/mcp/oauth/*`, `/.well-known/*`), conectores (`/api/connect/{clerk,neon,resend,twilio,google_maps}`), billing/Stripe (`/api/billing/*`, `/api/webhooks/stripe`), GitHub (`/api/github/*`, `/api/auth/github/*`), forge (`/api/forge/*`), vault de secretos (`/api/vault/*`), admin (`/api/admin/*`), push (`/api/push/*`), MCP (`/api/mcp/*`).

---

## 5. Operación (Owner / Admin)

- **Migraciones / seed / health:** `POST /api/admin/migrate`, `/api/admin/seed-oauth`, `GET /api/admin/health` con header `Authorization: Bearer $VFORGE_OPERATOR_TOKEN`.
- **Conectar integraciones:** desde `/app/integrations` (Clerk, Neon, Resend, Twilio, Google Maps, Stripe, GitHub, Vercel).
- **Secretos:** `/app/secrets` → vault (`/api/vault/operator-secrets`, `/api/vault/project-secrets`).
- **Deploy:** `vercel build --prod` luego `vercel deploy --prebuilt --prod --archive=tgz` (CLI, evita BLOCKED del flujo normal). Node 20.

### Variables de entorno clave
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VFORGE_OWNER_EMAILS`, `VFORGE_OPERATOR_TOKEN`, `HUB_BRIDGE_URL`, `HUB_BRIDGE_TOKEN`, `DATABASE_URL` (Neon), claves de Stripe/Resend/Twilio/Google Maps/GitHub/Vercel según el conector.

---

## 6. Flujos completos

- **Visitante → cliente:** landing → `/pricing` o `/marketplace` → `/sign-up` → `/onboarding` → `/workspace`.
- **Owner trabajando:** `/sign-in` → `/app/home` → `projects` / `integrations` / `deployments` → V en `/forge` para construir.
- **Construir con V:** `/forge`, elegir scope (general o proyecto), V usa memoria + herramientas (GitHub, deploys) y responde por streaming.
- **MCP externo:** cliente MCP se conecta vía OAuth (`/.well-known/*` + `/api/mcp/oauth/*`) al endpoint MCP.

---

## 7. Estado de calidad (Definition of Done — verificado 2026-06-10)

1. **Estabilidad:** ✔ 0 errores de conexión, 0 páginas que no cargan, 0 404, 0 crashes. 17 rutas crawleadas → consola y red **limpias** (TOTAL_ISSUES 0).
2. **Módulos:** ✔ rutas públicas y de copiloto funcionando; rutas owner gated correctamente (401/403 cuando corresponde, no errores).
3. **Contenido coherente:** ✔ imágenes localizadas en `/public` (sin hotlink que caduca), carruseles con fallback visible, sin listas duplicadas.
4. **Manual:** ✔ este documento.
5. **Responsive:** ✔ verificado a 390 / 768 / 1440 (hero, scroll, día/noche OK).

---

## 8. Errores de conexión que estaban y cómo se cerraron (esta sesión)

| # | Síntoma | Causa raíz | Fix |
|---|---|---|---|
| 1 | `/forge` y `/v` disparaban `401` en `/api/projects`, `/api/forge/active-session`, `/api/forge/conversations` para visitantes anónimos → spam de "Failed to load resource: 401" en consola | El grupo de rutas `(dashboard)` (`/forge`, `/v`) NO estaba protegido en el middleware: un anónimo renderizaba el dashboard privado y este llamaba APIs owner-only | Se agregaron `/forge(.*)`, `/v` y `/api/v/chat(.*)` a `isProtected` **e** `isOwnerOnly`. Ahora el anónimo se redirige limpio a `/sign-in` (sin 401). |
| 2 | `net::ERR_ABORTED` recurrente en prefetch RSC de `/sign-in` y `/sign-up` desde varios `<Link>` | Next.js prefetcha el payload RSC de las rutas catch-all de Clerk, que abortan la petición | `prefetch={false}` en los 10 `<Link>` a `/sign-in` y `/sign-up` (Hero, CTA, Método, ProductCarousel, MarketingHeader, pricing, marketplace, mcp, glossary). |

Commit: `601d97e` · Deploy prebuilt READY · alias vforge.site.

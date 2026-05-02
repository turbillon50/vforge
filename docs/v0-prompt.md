# Prompt maestro para v0.dev — vForge Frontend MVP

> Pega la sección **2** primero en un nuevo chat de v0.dev. Luego usa los prompts de la sección **3** uno por uno, en orden. Si algo no queda exacto, los prompts de la sección **4** sirven como refinamiento puntual.

---

## 1) Cómo usarlo en v0.dev

1. Entra a [v0.dev](https://v0.dev) → **New Chat**.
2. Pega el **PROMPT MAESTRO** completo (sección 2). v0 generará el shell + el dashboard `/hub`.
3. Cuando termine, dale **Continue / Add a screen** y pega cada **PROMPT DE PANTALLA** (sección 3) uno por uno.
4. Para detalles finos (logo exacto, microanimación, etc.) usa los **PROMPTS DE REFINAMIENTO** (sección 4) sobre el componente seleccionado.
5. Al final: **Deploy to Vercel** desde la propia v0 → te da URL `*.vercel.app` automática.
6. **Sync to GitHub** desde v0 → rama `claude/vforge-frontend-mvp-A4BrL` del repo `turbillon50/vforge`.

> **Tip:** v0 funciona mejor cuando cada turno toca **un componente o pantalla**. No le pidas las 10 pantallas en una sola pasada; pierde detalle.

---

## 2) PROMPT MAESTRO

````
Build a premium, mobile-first dashboard called **vForge** — described as
"el sistema operativo para crear y controlar aplicaciones como una fábrica."
The visual language must feel like a fusion of Vercel.com, Linear, and
Clerk: pure black background, monochrome surfaces, single accent color
(lime green from logo), Geist typography, ultra-tight letter-spacing,
generous negative space, premium feel.

# STACK (v0 defaults are perfect)
- Next.js 14 App Router · TypeScript strict · Tailwind CSS · shadcn/ui
- framer-motion for transitions · lucide-react for icons
- Geist Sans (body) + Geist Mono (technical data, paths, secrets)
- All copy in **Mexican Spanish**, never neutral/Castilian

# DESIGN TOKENS (define as CSS variables in globals.css)
Colors:
  --bg #000000 · --bg-1 #0A0A0A · --bg-2 #111111 · --bg-3 #161616 · --bg-elev #1C1C1C
  --fg #FAFAFA · --fg-1 #A1A1A1 · --fg-2 #717171 · --fg-3 #525252
  --border #1F1F1F · --border-1 #2A2A2A · --border-2 #383838
  --green #7CFF3C  (THE ONLY saturated color in the entire UI)
  --green-dim rgba(124,255,60,0.12)
  --green-glow rgba(124,255,60,0.35)
  --green-soft rgba(124,255,60,0.06)
  --warning #F5A524 · --error #F31260 · --info #006FEE

Typography:
  - Display/body: Geist Sans, letter-spacing -0.005em (body), -0.02em to -0.04em (titles)
  - Mono: Geist Mono for tokens, paths, secret names, commit hashes
  - Title weights: 600 max. No bolder.

Spacing: 8pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
Radius: sm 6, md 8, lg 12, xl 16
Transitions: 120ms · 200ms · 300ms with cubic-bezier(0.4, 0, 0.2, 1)
Shadows: only used for the green glow accent and elevation rings (1px borders, never blurry drop-shadows).

# BRAND / LOGO (component <Brand />)
The logo is text-only with two iconic touches:
- The letter "V" wears a vertical lime-green border bracket (like skewed
  brackets) on left and right, slightly italic skewX(-14deg), with a
  6px green-glow box-shadow.
- The letters "Forge" use a vertical gradient text (white #FFF top → #777 bottom),
  EXCEPT the "o" which is replaced by a small lime-green ring (14px circle,
  1.5px border, green-glow shadow) with a vertical "tab" sticking up from
  its top (like a power-button icon). That tab is 1.5px wide, 5px tall, lime green.

Use this logo in:
- topbar (small)
- bottom of sidebar (medium)
- favicon (just the green ring with tab)
- splash if any

# LAYOUT & NAVIGATION (responsive)

## Mobile (< 768px)
- **Topbar** fixed: hamburger · <Brand/> · project-switcher chip · bell · settings cog (no mic icon)
- **Bottom nav** fixed, 5 tabs: `Hub` · `Proyectos` · **`FORGE`** · `Bóveda` · `Módulos`
  - The center tab "FORGE" is a raised lime-green circle (margin-top: -16px,
    bg green, 4px black ring, glow shadow). Icon: Sparkles or Zap.
- **Drawer** opens from left when hamburger tapped: full nav tree with
  3 sections (CONTROL · HERRAMIENTAS · SISTEMA) and the brand at bottom.

## Desktop (>= 768px)
- **Sidebar** persistent left, 220px wide (240px at >= 1024px), with three
  grouped sections labelled in 11px uppercase fg-2:
    CONTROL: Hub · Proyectos · Forge AI · Actividad
    HERRAMIENTAS: Repo Vision · Repo Hunter · Stack Scout · Bóveda · Módulos
    SISTEMA: Configuración
  Active item gets a 2px lime-green left bar with green-glow shadow
  (use `::before` pseudo). Inactive: text-fg-1, hover bg-1.
- No bottom nav.

Both layouts: page content in a max-w-6xl container with px-5 (mobile) / px-8 (desktop).

# SCREENS (10 routes — generate the structure now, then I'll iterate)

Routes:  /hub  ·  /projects  ·  /projects/[slug]  ·  /forge  ·  /vault  ·
         /vision  ·  /hunter  ·  /scout  ·  /modules  ·  /activity  ·  /settings
Root /  → redirects to /hub.

For THIS first generation, build:
1. The **app shell** (topbar + sidebar + mobile bottom nav + drawer + brand).
2. The **/hub** page fully implemented:
   - Eyebrow "Buenos días, Luis" (font-mono, fg-2, uppercase, tracking-wide, 11px)
   - Title "Tu fábrica" (text-3xl md:text-4xl, weight 600, tracking-tight)
   - Subtitle: "8 proyectos · 6 en producción · 2 en construcción" (fg-1)
   - 4 stat cards in grid (2 cols mobile, 4 cols desktop):
       · "Proyectos activos" 8 (delta: +1 esta semana)
       · "Deploys hoy" 14 (delta: 12 ok · 2 fallidos)
       · "Forge runs" 47 (delta: avg 1.4 min)
       · "Uptime promedio" 99.84% (delta: últimos 30 días)
     Each stat card: bg-bg-1, border border-border, rounded-lg, p-5, with
     small icon top-left in green, big number Geist Mono 32px, label fg-2 11px,
     delta line in green or warning color.
   - Section "Proyectos recientes" (title 13px uppercase fg-2 + "Ver todos" link green) showing the
     first 4 projects from MOCK DATA below as horizontal rows: project favicon
     (gradient square 36px) + name + repo (mono fg-2 12px) + status pill on right.
   - Section "Actividad reciente" with 3 activity rows: small green dot + relative time (mono fg-2)
     + actor + verb + target (e.g., "Forge desplegó castores.info → producción").

3. Stub the other 9 routes as simple pages with the same header pattern but
   placeholder content for now.

# MOCK DATA — put it ALL in `lib/mock-data.ts` and import everywhere

```ts
export const PROJECTS = [
  { id:"castores", name:"Castores Control", slug:"castores",
    repo:"turbillon50/FINAL-CASTORES", domain:"castores.info",
    stack:"Next 14", status:"live", lastDeploy:"3h",
    favicon:{gradient:"from-green-900 to-black", initials:"CC", color:"#7CFF3C"},
    description:"Construction management web app", secrets:8, deploysToday:3 },
  { id:"vandefi", name:"VanDeFi", slug:"vandefi",
    repo:"turbillon50/vandefi", domain:"vandefi.bandefi.org",
    stack:"Next 14", status:"building", lastDeploy:"1h",
    favicon:{gradient:"from-blue-900 to-black", initials:"VD", color:"#6699FF"},
    description:"Non-custodial DeFi neobank", secrets:12, deploysToday:2 },
  { id:"urmah", name:"URMAH", slug:"urmah",
    repo:"turbillon50/urmah", domain:"urmah.live",
    stack:"PWA", status:"live", lastDeploy:"2d",
    favicon:{gradient:"from-red-900 to-black", initials:"UR", color:"#FF8866"},
    description:"Cinematic ticketing PWA", secrets:6, deploysToday:0 },
  { id:"movee", name:"Movee", slug:"movee",
    repo:"turbillon50/movee", domain:"movee.mx",
    stack:"React", status:"live", lastDeploy:"5d",
    favicon:{gradient:"from-cyan-900 to-black", initials:"MV", color:"#66DDDD"},
    description:"Ride-sharing for Mexico", secrets:5, deploysToday:1 },
  { id:"rivones", name:"Rivones / Autospot", slug:"rivones",
    repo:"turbillon50/rivones", domain:"autospot.mx",
    stack:"Vite", status:"error", lastDeploy:"1d",
    favicon:{gradient:"from-orange-900 to-black", initials:"RV", color:"#FFAA66"},
    description:"Car rental marketplace · build failed", secrets:4, deploysToday:0 },
  { id:"jobber", name:"Jobber Logística", slug:"jobber",
    repo:"turbillon50/jobber-", domain:"jobber.allglobal.ec",
    stack:"Next 14", status:"live", lastDeploy:"6h",
    favicon:{gradient:"from-purple-900 to-black", initials:"JL", color:"#BB99FF"},
    description:"Parcel logistics PWA", secrets:7, deploysToday:1 },
  { id:"sure", name:"Sure & Sure", slug:"sure",
    repo:"turbillon50/sure-and-sure", domain:null,
    stack:"Planning", status:"idle", lastDeploy:null,
    favicon:{gradient:"from-blue-900 to-slate-900", initials:"SS", color:"#88BBFF"},
    description:"Life insurance premium financing fund", secrets:0, deploysToday:0 },
  { id:"vmomentum", name:"V-Momentum HQ", slug:"vmomentum",
    repo:"turbillon50/v-momentum", domain:"momentum.allglobal.ec",
    stack:"Next 14", status:"live", lastDeploy:"12h",
    favicon:{gradient:"from-pink-900 to-black", initials:"VM", color:"#FF99DD"},
    description:"App factory for client projects", secrets:5, deploysToday:7 },
];

export const VAULT_SECRETS = [
  { name:"STRIPE_SECRET_KEY", project:"castores", lastUsed:"2h", scope:"client", injectedTo:["vercel","railway"] },
  { name:"DATABASE_URL", project:"castores", lastUsed:"1m", scope:"platform", injectedTo:["vercel"] },
  { name:"CLERK_SECRET_KEY", project:"castores", lastUsed:"3h", scope:"platform", injectedTo:["vercel"] },
  { name:"RESEND_API_KEY", project:"castores", lastUsed:null, scope:"platform", injectedTo:[] },
  { name:"VERCEL_TOKEN", project:null, lastUsed:"1m", scope:"platform-global", injectedTo:[] },
  { name:"ANTHROPIC_API_KEY", project:null, lastUsed:"30s", scope:"platform-global", injectedTo:[] },
  { name:"GITHUB_TOKEN", project:null, lastUsed:"5m", scope:"platform-global", injectedTo:[] },
  { name:"CLOUDFLARE_API_TOKEN", project:null, lastUsed:"1h", scope:"platform-global", injectedTo:[] },
];

export const MODULES = [
  { id:"repo-vision", name:"Repo Vision", description:"Diagrama + mockup visual de cualquier repositorio en 2 min.", state:"installed", tags:["CLAUDE","MERMAID"], icon:"Eye" },
  { id:"repo-hunter", name:"Repo Hunter", description:"Búsqueda semántica de repositorios en GitHub, NPM y awesome lists.", state:"installed", tags:["GITHUB","NPM"], icon:"Search" },
  { id:"stack-scout", name:"Stack Scout", description:"Recomendaciones técnicas: qué proveedor usar y cómo conectarlo.", state:"installed", tags:["RESEARCH"], icon:"Compass" },
  { id:"health-monitor", name:"Health Monitor", description:"Vigilancia 24/7 de uptime, deploys y errores en producción.", state:"installed", tags:["SENTRY","UPTIME"], icon:"Activity" },
  { id:"contracts", name:"Contracts", description:"NDA, prestación, asociación · firma digital · plantillas MIRMAR.", state:"available", tags:["DOCX","PDF","SIGN"], icon:"FileText" },
  { id:"billing-sat", name:"Billing SAT 4.0", description:"Facturación electrónica MX automática vía Facturapi.", state:"available", tags:["SAT","FACTURAPI"], icon:"DollarSign" },
  { id:"whatsapp-bot", name:"WhatsApp Bot", description:"Comunicación con clientes vía Twilio · plantillas + auto-reply.", state:"available", tags:["TWILIO"], icon:"MessageSquare" },
  { id:"analytics-cross", name:"Analytics Cross", description:"Métricas cruzadas de Stripe, MercadoPago, Ticket Tailor.", state:"beta", tags:["STRIPE","MP"], icon:"BarChart" },
  { id:"backups-vault", name:"Backups Vault", description:"Backups nocturnos cifrados a Cloudflare R2 · retención 30+12.", state:"available", tags:["R2","AES256"], icon:"Database" },
  { id:"client-portal", name:"Client Portal", description:"Portal externo para que clientes vean sus proyectos en vivo.", state:"available", tags:["AUTH","CLERK"], icon:"Users" },
  { id:"legal-monitor", name:"Legal Monitor", description:"Monitoreo semanal de menciones públicas con alertas.", state:"available", tags:["WEB","ALERTS"], icon:"Shield" },
  { id:"tax-tracker", name:"Tax Tracker", description:"Tracker fiscal MIRMAR con OCR de tickets y conciliación bancaria.", state:"beta", tags:["OCR","SAT"], icon:"Calculator" },
];

export const ACTIVITY = [
  { id:1, time:"3 min", actor:"Forge", verb:"desplegó", target:"castores.info → producción", kind:"deploy", project:"castores" },
  { id:2, time:"12 min", actor:"Luis", verb:"agregó secreto", target:"STRIPE_SECRET_KEY a Castores", kind:"vault", project:"castores" },
  { id:3, time:"34 min", actor:"Forge", verb:"falló build en", target:"rivones / autospot.mx", kind:"error", project:"rivones" },
  { id:4, time:"1 h", actor:"Forge", verb:"escaneó repo", target:"vandefi (score 9/10)", kind:"vision", project:"vandefi" },
  { id:5, time:"2 h", actor:"Health Monitor", verb:"alertó latencia alta en", target:"jobber.allglobal.ec", kind:"warning", project:"jobber" },
  { id:6, time:"3 h", actor:"Luis", verb:"creó proyecto", target:"Sure & Sure", kind:"create", project:"sure" },
  { id:7, time:"5 h", actor:"Forge", verb:"propuso stack para", target:"V-Momentum HQ", kind:"scout", project:"vmomentum" },
  { id:8, time:"6 h", actor:"Forge", verb:"desplegó", target:"jobber.allglobal.ec → producción", kind:"deploy", project:"jobber" },
  { id:9, time:"8 h", actor:"Luis", verb:"actualizó dominio de", target:"Movee", kind:"settings", project:"movee" },
  { id:10, time:"12 h", actor:"Forge", verb:"desplegó", target:"momentum.allglobal.ec", kind:"deploy", project:"vmomentum" },
  { id:11, time:"1 d", actor:"Backups Vault", verb:"completó snapshot de", target:"8 proyectos a R2", kind:"backup", project:null },
  { id:12, time:"2 d", actor:"Forge", verb:"refactorizó schema en", target:"URMAH", kind:"refactor", project:"urmah" },
];

export const RECENT_VISION = [
  { repo:"turbillon50/vandefi", score:"9/10", duration:"1m 47s", time:"1 h" },
  { repo:"shadcn/ui", score:"10/10", duration:"2m 03s", time:"yesterday" },
  { repo:"vercel/next.js", score:"10/10", duration:"4m 12s", time:"3 d" },
];

export const RECENT_HUNTER = [
  { query:"PWA ticketing offline-first", results:14, time:"30 min" },
  { query:"DeFi self-custody wallet React", results:22, time:"4 h" },
  { query:"OCR receipt extraction node", results:9, time:"2 d" },
];

export const RECENT_SCOUT = [
  { question:"¿Qué proveedor para video chat WebRTC con grabación?", answer:"LiveKit Cloud", time:"1 h" },
  { question:"¿Cómo cobrar SPEI con conciliación automática?", answer:"Conekta vs MercadoPago", time:"1 d" },
  { question:"¿Mejor stack para PWA cinematográfica iOS-grade?", answer:"Next 14 + Capacitor + Framer", time:"3 d" },
];
```

# COMPONENTS NEEDED (build during this first turn)
- `<Brand />` — exact logo as described above
- `<StatusPill status="live|building|error|idle" />` — pill bg-bg-2 border, dot in front,
  text mono uppercase 10px, color mapped: live=green (with `dot-live` pulse class),
  building=warning, error=error, idle=fg-2
- `<StatCard icon, label, value, deltaLabel, deltaTone="positive|warning|neutral" />`
- `<ProjectFavicon project />` — 36px rounded-md gradient square with white initials Geist mono 11px
- `<ProjectRow project />` — favicon + name + mono repo + status pill
- `<ActivityRow item />` — green dot + mono time + actor span (fg) + verb (fg-1) + target (mono fg)
- `<FilterChip active label />` — pill, active=bg-green-dim border-green text-green
- `<SectionHeader title rightCta />`
- App shell: `<Topbar/>`, `<Sidebar/>`, `<MobileNav/>`, `<Drawer/>`, `<ProjectSwitcher/>`

# INTERACTIONS
- Page enter: stagger fade-up via framer-motion (delay 0, 0.05, 0.1, 0.15, 0.2 to first 5 children)
- Status pill "live": pulsing green dot
- Hover project row: bg-bg-1, no transform
- Composer mic button: scale 1.05 on hover, 0.95 active, expanding green glow
- Drawer mobile: slide-up backdrop fade
- Add `navigator.vibrate?.(8)` on mobile nav tap (guard for SSR)

# DON'T
- DO NOT add any other accent colors. Only --green is saturated.
- DO NOT use heavy gradients except the project favicons and the Forge text gradient.
- DO NOT use rounded-full pills everywhere; status pills are pill, but cards are rounded-lg max.
- DO NOT add Material/Chakra/Mantine. Stick to shadcn primitives.
- DO NOT add login screens, splash, marketing landing. This is the authenticated dashboard only.
- DO NOT translate brand names or product names; keep "Forge", "Hub", "Vault", "Vision", "Hunter", "Scout", "Modules" as-is or in their Spanish counterpart already in mock data.
- DO NOT use emojis in the UI.
- DO NOT introduce real backend calls, auth, or API routes. Pure mock from `lib/mock-data.ts`.
- DO NOT include any Sentry / analytics / Stripe SDK / OAuth. Frontend only.
- TypeScript strict, zero `any`. Use `unknown` and narrow if needed.

# SEO / METADATA
- title: "vForge — Build · Deploy · Evolve"
- description: "El sistema operativo para crear y controlar tus aplicaciones como una fábrica."
- theme-color: #000000
- viewport: width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover
- favicon: small green ring with vertical tab (matches the "o" in the logo)

Generate the full project now: shell + /hub + stubs for the other 9 routes.
````

---

## 3) Prompts de pantalla (uno por turno, en este orden)

### 3.1 — `/projects`
```
Implement the /projects route. Header (eyebrow "BIBLIOTECA" mono fg-2 + title "Tus 8 proyectos" + subtitle "Filtra por estado o familia"). Below: horizontal scrollable filter chips: Todos · Live · Warning · Error · V-Family · V-Momentum. Then full vertical list of all 8 PROJECTS from mock-data as <ProjectRow/> with hover bg-bg-1, separators border-t border-border. Tap row → router.push(`/projects/${slug}`).
```

### 3.2 — `/projects/[slug]`
```
Build /projects/[slug] detail. Lookup project by slug from PROJECTS. Header: large favicon 56px + name (text-3xl tracking-tight) + repo (mono fg-2). Right side: action buttons "Abrir dominio" (ghost) + "Desplegar" (green primary). Body: 3 stat cards (Status, Last deploy, Deploys hoy). Section "Secretos del proyecto" (filter VAULT_SECRETS by project). Section "Actividad de este proyecto" (filter ACTIVITY). Empty states for sure (no domain, no deploys) — show muted message in fg-2.
```

### 3.3 — `/forge` (la pantalla más importante)
```
Build /forge — chat with the orchestrator AI "Forge". Layout: small sticky header (just title "Forge" + status "Listo" green dot) + scrollable <ChatStream/> + sticky <Composer/> at bottom.

Messages:
- User messages: right-aligned, bg-bg-3, rounded-lg, max-w-[80%], px-4 py-3.
- Forge messages: left-aligned, no bg, border-l-2 border-green pl-4, max-w-[90%]. Title row: "FORGE" mono uppercase 11px green + small lightning icon. Content can include markdown-style steps (bullet list, mono code chips), inline action buttons "Procede" (green solid) / "Editar plan" (ghost border).

Composer (sticky bottom, bg-bg-1, border-t border-border, p-3): row of icon buttons [paperclip · camera · …] + textarea (bg-bg-2 border-border-1 focus:border-border-2 rounded-md, placeholder "Dile a Forge qué hacer…") + circular green mic button on right (40px, bg-green text-black, voice-button class).

Seed the chat with this mock conversation:
1. User: "cambia el logo del Castores"
2. Forge: "Ok. Plan: 1) abrir repo turbillon50/FINAL-CASTORES, 2) sustituir /public/logo.svg, 3) actualizar referencias en components/Header.tsx, 4) commit + deploy. ¿Procedo?" — with [Procede] [Editar plan] buttons
3. User: "procede"
4. Forge: streaming-style steps with green check marks: ✓ Repo clonado · ✓ Logo sustituido · ✓ Header actualizado · ⏳ Building en Vercel… · (last item shows a tiny green spinner)
```

### 3.4 — `/vault`
```
Build /vault. Header (eyebrow "BÓVEDA · 0-knowledge", title "Tus secretos", subtitle "Cifrados extremo a extremo · acceso por 2FA"). Filter chips: Todos · Castores · VanDeFi · URMAH · Globales.

Add-secret card (bg-bg-1 border-border rounded-lg p-5, full width): title "Agregar secreto", subtitle "Elige cómo lo capturas". Below, 2x2 grid of 4 method tiles: 📋 Pegar texto · 📷 Foto del archivo .env · 📁 Subir .env · 🎙 Dictado por voz. Each tile: small icon (lucide), title, one-line description. Hover: bg-bg-2.  (DO NOT use real emojis — use lucide icons: Clipboard, Camera, Upload, Mic.)

Secrets list: each row = lock icon (gray) + name (Geist Mono 14px) + sub-line "Proyecto · usado hace 2h · inyectado a vercel, railway" (mono fg-2 11px) + "Ver" ghost button (no copy button, this is sensitive).

Use VAULT_SECRETS from mock-data.
```

### 3.5 — `/vision`
```
Build /vision (Repo Vision tool). Header eyebrow "HERRAMIENTA · CLAUDE", title "Repo Vision", subtitle "Diagrama y mockup visual de cualquier repo en 2 min".

Big input card: bg-bg-1 border-border rounded-xl p-6. Inside: label "URL del repositorio", text input with placeholder "https://github.com/usuario/repo o ruta local", below it a green primary button "Analizar" (full width on mobile, auto on desktop) + secondary ghost "Pegar del portapapeles".

Section "Análisis recientes" with RECENT_VISION rows: each row = small folder icon + repo path (mono) + score chip (e.g. "9/10" — green if ≥8, warning if 5-7, error <5) + duration mono fg-2 + relative time fg-2.
```

### 3.6 — `/hunter`
```
Build /hunter (Repo Hunter). Header eyebrow "HERRAMIENTA · GITHUB · NPM", title "Repo Hunter", subtitle "Búsqueda semántica entre miles de repos".

Big input: textarea-style search "¿Qué tipo de repo buscas? Describe en lenguaje natural…" with green button "Buscar". Filter chips below: Todos · Frameworks · Boilerplates · Awesome lists · NPM packages.

Section "Búsquedas recientes" using RECENT_HUNTER: each row = magnifier icon + query text + count badge (mono "14 resultados") + relative time.
```

### 3.7 — `/scout`
```
Build /scout (Stack Scout). Header eyebrow "HERRAMIENTA · RESEARCH", title "Stack Scout", subtitle "Recomendaciones técnicas accionables".

Input: textarea "Pregúntame qué proveedor o stack usar…" + green button "Consultar".

Section "Consultas guardadas" using RECENT_SCOUT: each card (bg-bg-1 rounded-lg p-4) shows the question (text-fg, weight 500) and below it the answer summary (fg-1 text-sm) + relative time mono fg-2.
```

### 3.8 — `/modules`
```
Build /modules. Header eyebrow "ECOSISTEMA", title "Módulos", subtitle "12 instalados o disponibles · genera más con Forge". Filter chips: Todos · Instalados · Disponibles · Beta.

Grid of cards (1 col mobile, 2 cols md, 3 cols lg) using MODULES. Each card: bg-bg-1 border-border rounded-lg p-5. Top row: lucide icon (mapped from module.icon) in green-dim circle 32px + state badge (Instalado=green-dim/green text, Disponible=fg-2 outline, Beta=warning). Title (weight 600 tracking-tight). Description (fg-1 text-sm). Bottom row: tags as tiny mono uppercase 10px chips (bg-bg-2). Hover: border-border-1 bg-bg-2.

Append a final special card "Generar módulo nuevo" with a Sparkles icon, a one-line pitch and a "Pedirle a Forge" button that links to /forge.
```

### 3.9 — `/activity`
```
Build /activity. Header eyebrow "REGISTRO", title "Actividad", subtitle "Todo lo que pasa en tu fábrica · cronológico". Filter chips: Hoy · 7 días · Deploys · Bóveda · Errores. Render full ACTIVITY list as <ActivityRow/> with a left vertical timeline (border-l border-border-1, dots that change color by kind: deploy=green, vault=info, error=error, warning=warning, default=fg-2). Group by relative bucket headers (Hoy / Esta semana / Antes) — small mono uppercase fg-2 11px.
```

### 3.10 — `/settings`
```
Build /settings. Header eyebrow "SISTEMA", title "Configuración", subtitle "Tu cuenta, integraciones y seguridad".

Section "Cuenta" (bg-bg-1 rounded-lg border): rows for Nombre (Luis Humberto de la Torre Herrera), Email (luis@allglobal.ec), Organización (All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.), Idioma (Español MX), 2FA (badge "Activo" green-dim). Each row: label fg-2 + value fg + chevron right.

Section "Integraciones conectadas" — list with brand-mark + name + status pill: GitHub (turbillon50, conectado), Vercel (luis-team, conectado), Neon (3 proyectos), Anthropic (API activa), Cloudflare (R2 + Workers).

Section "Seguridad": rows for "Master key" (mono asterisks + "Rotar"), "Audit log" (link), "Sesiones activas" (2 dispositivos), "Borrar cuenta" (text error, danger zone style).

All sections separated by spacing 32px and h-px border between rows inside.
```

---

## 4) Prompts de refinamiento

### Si el logo no quedó bien
```
Replace the <Brand/> component. The logo is text-only:
- "V" with vertical lime-green brackets `::before` skewX(-14deg) and 6px green-glow box-shadow.
- "F", "r", "g", "e" use a vertical text gradient (linear-gradient 180deg #FFF → #777, -webkit-background-clip text).
- Replace the "o" with a 14px circle (1.5px solid #7CFF3C border, border-radius 50%, box-shadow 0 0 8px rgba(124,255,60,0.35)). The circle has a `::before` "tab" sticking 5px up from its top center, 1.5px wide, lime green with subtle glow.
Show only that component, no surrounding chrome.
```

### Si la paleta quedó muy gris/saturada
```
Audit the color usage. The ONLY saturated color allowed is --green #7CFF3C. Everything else must be black/gray scale (#000 → #FAFAFA). Remove any blue, purple, pink, indigo accents. Status pills: live=green, building=#F5A524, error=#F31260, idle=gray (--fg-2). Project favicon gradients are the ONE exception (each project has its own subtle gradient).
```

### Si las animaciones se sienten flojas
```
Tighten interactions. Use framer-motion `<motion.div>` with `initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:0.3, ease:[0.4,0,0.2,1]}}`. For staggered lists use `staggerChildren: 0.05`. The "live" status dot must pulse with a CSS keyframe at 2s loop, expanding green-glow box-shadow (animation-name pulse-dot). The mic button on /forge must scale 1.05 on hover and 0.95 on active, with a green-glow box-shadow that grows from 8px to 24px on hover.
```

### Si el bottom nav móvil no quedó
```
Fix the mobile bottom nav. 5 tabs: Hub · Proyectos · FORGE (raised) · Bóveda · Módulos. The center FORGE tab must be a circular button with margin-top: -16px, bg --green, text black, 4px solid --bg ring (so it pops above the bar), and a pulsing green-glow shadow. INSIDE the green button, render <ForgeOrb size={32} state="idle" glow={false} /> — NOT a Sparkles icon, NOT a Zap icon, NOT a generic lucide primitive. The mascot orb IS the button content. The other 4 tabs are flat: small icon top + label below (10px mono uppercase). Active tab: text white. Inactive: text --fg-2.
```

### Si v0 mete dependencias raras
```
Use only shadcn/ui primitives plus framer-motion and lucide-react. No other UI libraries (no MUI, no Chakra, no Mantine, no styled-components, no emotion). All icons must come from lucide-react.
```

---

## 5) Logo `<Brand />` + íconos del sistema + soporte de tema (consolidado)

> En v0: abre el componente `<Brand />`, **adjunta la referencia visual `vforge-logo.png`** (el wordmark plateado con anillo verde) y pega este prompt. Reemplaza por completo la versión anterior. Incluye: recreación CSS fiel del wordmark, exportación de íconos del sistema (favicon, PWA, Apple touch, OG) y comportamiento dual día/noche del wordmark sin redibujarlo.

````
Ship a faithful CSS recreation of the attached vForge wordmark AND export
all the system icons the project needs (favicon, PWA, Apple touch, OG).
Single source of truth for the brand.

# 1. WORDMARK <Brand />
- Pure CSS recreation of the attached image (no <img>, no external SVG except
  for the optional ring "tab" notch).
- Word "VForge". The "V" leans skewX(-10deg), thick. "Forge" is tight tracking.
  Letterforms must read as brushed aluminium / chrome.

## Metallic gradient (token-aware — different per theme)
Define two metallic gradients in globals.css:

  /* dark theme — bright chrome on black */
  [data-theme="dark"] {
    --metal: linear-gradient(180deg,
      #f7f7f7 0%, #d8d8d8 28%, #8a8a8a 52%, #c8c8c8 76%, #4b4b4b 100%);
    --metal-shadow: 0 1px 0 rgba(0,0,0,0.6);
  }

  /* light theme — graphite chrome on white */
  [data-theme="light"] {
    --metal: linear-gradient(180deg,
      #1f1f1f 0%, #4a4a4a 28%, #6a6a6a 52%, #3a3a3a 76%, #0d0d0d 100%);
    --metal-shadow: 0 1px 0 rgba(255,255,255,0.5);
  }

Apply with -webkit-background-clip: text, color: transparent,
filter: drop-shadow(var(--metal-shadow)).

## Green V rails (both themes)
Around the V: two vertical lime-green light bars (left + right edge),
width 3px, height ~115% of the V cap-height, background var(--green) #7CFF3C.
Box-shadow: 0 0 14px var(--green-glow), 0 0 28px var(--green-glow).
On light theme reduce glow to 0 0 10px / 0 0 18px so it doesn't bloom.

## Green ring replacing the "o" in "Forge"
- Outer circle 0.85em, 2px solid var(--green), border-radius 50%.
- Box-shadow (dark): 0 0 10px var(--green-glow), 0 0 22px var(--green-glow), inset 0 0 6px var(--green-soft).
- Box-shadow (light): tighter — 0 0 6px rgba(124,255,60,0.35), inset 0 0 4px rgba(124,255,60,0.18).
- Vertical "tab" notch on top: 2px × 6px lime-green slit, glowing,
  rendered via ::before that masks the top of the ring then redraws
  the slit above it.
- Tiny 4px solid green dot in dead center of the ring (the LED).

## Tagline "BUILD. DEPLOY. EVOLVE."
Below wordmark, mono uppercase, var(--green-text), letter-spacing 0.4em,
font-size 11px, weight 500. Flank with two 1px × 32px green hairlines,
each ending in a tiny green dot — exactly like the reference.

## Reflection (xl size only)
A scaleY(-1) copy of the wordmark, mask-image gradient fading to
transparent, opacity 0.18 (dark) / 0.10 (light), 0.5px blur.

## Component API
```tsx
type BrandProps = {
  size?: "sm" | "md" | "lg" | "xl"; // sm=topbar, md=sidebar, lg=hero, xl=splash
  showTagline?: boolean;
  showReflection?: boolean;
  className?: string;
};
```
Sizes: sm 16px · md 22px · lg 40px · xl 72px.

# 2. SYSTEM ICONS (export to /public)
Generate these files. They all share the same shape: the green power-button
ring with the tab on top — same as the "o" in the wordmark.

  /public/favicon.svg            // 32×32, transparent bg, vector
  /public/favicon.ico            // 48×48 fallback (multi-res 16/32/48)
  /public/icon-192.png           // PWA, 192×192, maskable safe-zone
  /public/icon-512.png           // PWA, 512×512, maskable safe-zone
  /public/apple-touch-icon.png   // 180×180, no transparency, bg #000
  /public/og.png                 // 1200×630, dark variant
  /public/og-light.png           // 1200×630, light variant

For PWA maskable icons: place the ring inside an 80%-of-canvas safe zone,
fill the surrounding 10% on each edge with solid var(--bg) so the OS can
mask to a circle/squircle without clipping the brand.

OG images: dark variant = black bg + ring + "vForge" wordmark (lg) +
tagline + faint grid pattern. Light variant = inverse.

# 3. WIRE INTO METADATA
Update app/layout.tsx Next.js Metadata:

```ts
export const metadata: Metadata = {
  title: { default: "vForge — Build · Deploy · Evolve", template: "%s · vForge" },
  description: "El sistema operativo para crear y controlar tus aplicaciones como una fábrica.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "vForge — Build · Deploy · Evolve",
    description: "El sistema operativo para crear y controlar tus aplicaciones como una fábrica.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "es_MX", type: "website",
  },
};
```

Generate /public/manifest.webmanifest:
```json
{
  "name": "vForge",
  "short_name": "vForge",
  "description": "Build · Deploy · Evolve",
  "start_url": "/hub",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

# 4. TOKEN ADDITIONS (drop into globals.css)
Add a green-strong variant for AA contrast on white:

  --green:        #7CFF3C;   // accent surfaces / glows / icons
  --green-strong: #2D8E1F;   // text/CTA labels on light bg (≥4.5:1 AA)
  --green-text:   var(--green);  // overridden in [data-theme="light"]

Use --green for fills, glows, ring strokes (works on both themes).
Use --green-text for any GREEN TEXT (tagline, "Procede" link, status pill
text "Live" in light mode, etc.).

# DON'T
- Do NOT redraw the brand for light mode — same glyph, just swap --metal
  and reduce glow intensity.
- Do NOT use accent colors other than green/error/warning/info tokens.
- Do NOT inline the icons as base64 — write real files in /public.
- Type strict, no `any`.

Render the component inside a 2-column preview:
left column on bg-bg (dark), right column on a forced white surface
(<div data-theme="light" className="bg-white p-12 rounded-xl">…</div>),
to verify both themes side by side.
````

---

## 6) Sistema de tema día / noche para TODA la app

> En v0: pega esto después de la sección 5 para activar light/dark con contraste real (no solo tokens espejados).

````
Implement a real Light/Dark theme system for vForge. Goal: identical
hierarchy and feel in both modes; not "blank page with same components"
— each mode should feel intentionally designed.

# STACK
- next-themes (npm i next-themes)
- attribute="data-theme" on <html>
- defaultTheme="dark"
- enableSystem=true (respect prefers-color-scheme on first visit)
- disableTransitionOnChange=false (we DO want a 200ms fade)

# TOKENS (replace globals.css :root entirely)

```css
/* shared */
:root {
  --green:         #7CFF3C;
  --green-strong:  #2D8E1F;
  --green-dim:     rgba(124, 255, 60, 0.12);
  --green-soft:    rgba(124, 255, 60, 0.06);
  --warning:       #F5A524;
  --error:         #F31260;
  --info:          #006FEE;
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* dark — default */
[data-theme="dark"] {
  --bg: #000000; --bg-1: #0A0A0A; --bg-2: #111111; --bg-3: #161616; --bg-elev: #1C1C1C;
  --fg: #FAFAFA; --fg-1: #A1A1A1; --fg-2: #717171; --fg-3: #525252;
  --border: #1F1F1F; --border-1: #2A2A2A; --border-2: #383838;
  --green-glow: rgba(124, 255, 60, 0.35);
  --shadow-elev: 0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px var(--border);
  --green-text: var(--green);
}

/* light — equally intentional */
[data-theme="light"] {
  --bg: #FFFFFF; --bg-1: #FAFAFA; --bg-2: #F4F4F4; --bg-3: #EDEDED; --bg-elev: #FFFFFF;
  --fg: #0A0A0A; --fg-1: #525252; --fg-2: #717171; --fg-3: #A1A1A1;
  --border: #E5E5E5; --border-1: #D4D4D4; --border-2: #B8B8B8;
  --green-glow: rgba(124, 255, 60, 0.22);
  --shadow-elev: 0 1px 2px 0 rgba(0,0,0,0.04), 0 0 0 1px var(--border);
  --green-text: var(--green-strong);
}
```

# CONTRAST AUDIT (must pass before declaring done)
- fg / bg          ≥ 16:1  in BOTH themes
- fg-1 / bg        ≥ 4.5:1 (body)
- fg-2 / bg        ≥ 3:1  (secondary captions only)
- green-text / bg  ≥ 4.5:1 (use --green on dark, --green-strong on light)
- white-on-green button (CTA): use bg-green text-black on BOTH themes
  → black on #7CFF3C is 12.4:1, perfect.

# APPLICATION RULES (refactor existing components)

1. NEVER hardcode #000, #FFF, #FAFAFA, etc. Use tokens.
2. Status pill colors stay the same hex per state, but pill BG uses
   --bg-2, border --border in both themes.
3. Project favicon gradients: keep their tones in dark; on light mode,
   lower their opacity to 0.6 so they don't scream.
4. Green dot pulse on "live" status: keep --green; box-shadow alpha
   already handled by token.
5. Code chips (Geist Mono): bg-bg-2 text-fg in both themes.
6. Forge chat user message bg: dark → bg-3, light → bg-2.
7. Vault add-secret tiles: bg-bg-1 hover:bg-bg-2 in both.
8. Sidebar active item: 2px green left bar + bg-bg-1 (slightly tinted
   in both modes).
9. Reflection / glow effects in dark are dialed back ~40% in light.
10. Logo <Brand /> already swaps --metal via [data-theme] (Section 5).

# THEME TOGGLE COMPONENT <ThemeToggle />
Place in the topbar, next to the bell.
- Pill 56×28, rounded-full, bg-bg-2 border-border.
- Inside: a 22×22 circle that slides left↔right when toggled
  (transform translateX(0) ↔ translateX(28px)), 200ms ease.
- The circle is bg-bg-elev with a sun icon (light) or moon icon (dark)
  from lucide. Stroke color: currentColor = --fg.
- Aria-label: "Cambiar tema · {actual}" with sr-only state text.
- On click: setTheme(theme === "dark" ? "light" : "dark") +
  navigator.vibrate?.(8).

For mobile drawer, expose the toggle as a full row at the bottom of
the drawer above the brand: label "Tema · Oscuro" / "Tema · Claro" with
the same toggle on the right.

# SSR HANDLING
- Wrap the app in <ThemeProvider> in app/layout.tsx (in a `"use client"`
  provider component).
- Add `suppressHydrationWarning` to <html>.
- Inline a script in <head> that reads localStorage and sets data-theme
  BEFORE first paint to avoid the flash:

```html
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    try{
      var t = localStorage.getItem('theme');
      if(!t){ t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
      document.documentElement.setAttribute('data-theme', t);
    }catch(e){}
  })();
`}} />
```

# META THEME COLOR (per theme)
Add inside <head>:
  <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#000000" />
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FFFFFF" />

# DELIVERABLE
- Refactored globals.css with token blocks above.
- New components/providers/theme-provider.tsx and components/ui/theme-toggle.tsx.
- Topbar + drawer mount <ThemeToggle />.
- Visual audit at the bottom of v0 preview: render /hub side by side at
  390px wide, one panel forced dark, one forced light. Both must look
  intentional, balanced, premium.

# DON'T
- Don't generate "high-contrast" or "sepia" — only dark and light.
- Don't re-skin charts or icons per theme; tokens take care of it.
- The toggle is binary; FIRST visit defaults to OS preference.
- Type strict, zero `any`.
````

---

## 7) ⚠️ CORRECTIVO — Forzar `<ForgeOrb />` (mascota) y reemplazar la estrellita del bottom nav

> Cuando v0 deja `Sparkles` o `Zap` en lugar de la mascota verde con ojitos, pega este prompt **completo**. Trae el JSX literal del componente para que v0 no pueda substituirlo por un icono de lucide.

````
URGENT — Replace the Sparkles icon in the bottom nav center button with
the vForge mascot orb. Right now /forge tab shows a generic Sparkles
icon. That is wrong. The center FORGE button must be the green ring
character with two vertical "eye" bars inside, exactly like the attached
reference image (which is blue — render it in green).

# STEP 1 — Create or REPLACE components/ui/forge-orb.tsx

Create the file with this EXACT SVG content. Do not substitute the shapes
for any lucide icon. Do not use Sparkles, Zap, Power, or Circle. The
geometry is non-negotiable:

```tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type ForgeOrbProps = {
  size?: number;
  state?: "idle" | "loading" | "happy" | "error";
  glow?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function ForgeOrb({
  size = 96,
  state = "idle",
  glow = true,
  className,
  ariaLabel = "Forge",
}: ForgeOrbProps) {
  const reduce = useReducedMotion();
  const stroke = state === "error" ? "var(--error)" : "var(--green)";

  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduce || state === "happy") return;
    const targets = [
      { x: 0, y: 0 }, { x: -4, y: 0 }, { x: 0, y: 0 },
      { x: 4, y: 0 }, { x: 0, y: 3 }, { x: 0, y: -3 },
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % targets.length;
      setLook(targets[i]);
    }, 1400 + Math.random() * 1600);
    return () => clearInterval(id);
  }, [reduce, state]);

  const eyeY = state === "happy" ? 2 : state === "error" ? 0 : look.y;
  const eyeX = state === "happy" || state === "error" ? 0 : look.x;
  const eyeScaleY = state === "happy" ? 0.5 : 1;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size, height: size,
        filter: "drop-shadow(0 0 10px var(--green-glow)) drop-shadow(0 0 22px var(--green-glow))",
      }}
    >
      {glow && (
        <span aria-hidden style={{
          position: "absolute", inset: "-30%",
          background: "radial-gradient(closest-side, var(--green-glow), transparent 70%)",
          opacity: 0.45, pointerEvents: "none",
        }} />
      )}
      <svg viewBox="0 0 200 200" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.g
          animate={
            state === "loading" && !reduce ? { rotate: 360 }
            : state === "error" && !reduce ? { scale: [1, 1.05, 1] }
            : { rotate: 0 }
          }
          transition={
            state === "loading" ? { repeat: Infinity, ease: "linear", duration: 1.6 }
            : state === "error" ? { repeat: Infinity, duration: 0.8 }
            : { duration: 0 }
          }
          style={{ transformOrigin: "100px 100px" }}
        >
          <path d="M 100,20 A 80,80 0 1,1 99.99,20" stroke={stroke} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="100" cy="100" r="72" stroke={stroke} strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
          <rect x="98.5" y="10" width="3" height="14" rx="1.5" fill={stroke} />
          <rect x="96" y="20" width="8" height="6" fill="var(--bg)" />
        </motion.g>

        <motion.g
          animate={{ x: eyeX, y: eyeY, scaleY: eyeScaleY }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: "100px 100px" }}
        >
          <motion.g
            animate={!reduce && state !== "happy" ? { scaleY: [1, 1, 0.08, 1, 1] } : { scaleY: 1 }}
            transition={
              !reduce && state !== "happy"
                ? { repeat: Infinity, duration: 5.5, times: [0, 0.93, 0.96, 0.99, 1], ease: "easeInOut" }
                : { duration: 0 }
            }
            style={{ transformOrigin: "100px 100px" }}
          >
            <rect x="82" y="80" width="8" height="40" rx="4" fill={stroke} />
            <rect x="110" y="80" width="8" height="40" rx="4" fill={stroke} />
          </motion.g>
        </motion.g>
      </svg>
    </span>
  );
}
```

# STEP 2 — Replace the Sparkles icon in the mobile bottom nav

Open components/shell/mobile-nav.tsx. Find the center FORGE tab. It
currently renders `<Sparkles className="h-5 w-5" />` (or similar) inside
a green circular button. REPLACE that icon with:

```tsx
import { ForgeOrb } from "@/components/ui/forge-orb";

// inside the FORGE tab button:
<ForgeOrb size={32} state="idle" glow={false} className="forge-orb-on-green" ariaLabel="Forge" />
```

The container button keeps its lime-green circle bg, the -16px raised
margin, and the 4px ring of var(--bg). The orb sits centered inside.

In globals.css, add the on-green variant so the orb reads against
the bright green button:

```css
.forge-orb-on-green svg path,
.forge-orb-on-green svg circle,
.forge-orb-on-green svg rect:not([fill="var(--bg)"]) {
  stroke: #000 !important;
  fill: #000;
}
.forge-orb-on-green svg rect[fill="var(--bg)"] { fill: var(--green); }
.forge-orb-on-green { filter: none !important; }
```

# STEP 3 — Replace the "Building en Vercel..." spinner

In the seeded /forge chat conversation, the "Building en Vercel…" step
uses a generic loop spinner. Replace that inline icon with:

```tsx
<ForgeOrb size={20} state="loading" glow={false} />
```

Place it in the same flex row, mr-2.

# STEP 4 — Replace the lightning bolt next to "FORGE" header in chat messages

Each Forge message header reads `FORGE ⚡` (a Zap icon). Replace the Zap
with:

```tsx
<ForgeOrb size={14} state="idle" glow={false} className="inline-block align-[-2px]" />
```

# STEP 5 — Add the orb to empty states

On /vision, /hunter, /scout, when there is no recent item or the user
hasn't searched yet, show a centered `<ForgeOrb size={120} state="idle" />`
with a one-line message below in fg-1.

# DON'T
- Do NOT use lucide Sparkles, Zap, Power, Circle, Loader2, or any
  similar primitive in place of <ForgeOrb />.
- Do NOT change the SVG geometry. Eyes must be vertical capsules, not
  dots, not stars.
- Do NOT animate via re-render — only framer-motion / CSS transforms.
- TypeScript strict, no `any`.

After the changes, render at the bottom of the v0 preview:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-12 bg-bg place-items-center">
  <ForgeOrb size={120} />
  <ForgeOrb size={120} state="loading" />
  <ForgeOrb size={120} state="happy" />
  <ForgeOrb size={120} state="error" />
</div>
```
````

---

## 8) ☢️ Brand "nuclear" — destruir y recrear

> Cuando v0 ignoró el §5 y dejó el wordmark con corchetes `[V]Forge` en texto plano. Este prompt lo obliga a borrar el archivo y recrearlo con CSS literal.

````
NUCLEAR REPLACEMENT — completely delete the current components/shell/brand.tsx
and recreate it from scratch. The file as it stands ignores the metallic
chrome typography and green-rails spec. Do not patch it; replace it.

Step 1. Delete components/shell/brand.tsx.
Step 2. Create a NEW components/shell/brand.tsx with EXACTLY this code:

```tsx
"use client";
import { cn } from "@/lib/utils";

type BrandSize = "sm" | "md" | "lg" | "xl";

const FONT_PX: Record<BrandSize, number> = { sm: 16, md: 22, lg: 40, xl: 72 };

export function Brand({
  size = "md",
  showTagline = false,
  showReflection = false,
  className,
}: {
  size?: BrandSize;
  showTagline?: boolean;
  showReflection?: boolean;
  className?: string;
}) {
  const px = FONT_PX[size];
  return (
    <div className={cn("brand-root inline-flex flex-col items-center", className)}>
      <div
        className="brand-wordmark"
        style={{ fontSize: px, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.04em" }}
      >
        <span className="brand-v">V</span>
        <span className="brand-forge">
          <span className="brand-letter">F</span>
          <span className="brand-ring" aria-hidden />
          <span className="brand-letter">r</span>
          <span className="brand-letter">g</span>
          <span className="brand-letter">e</span>
        </span>
      </div>

      {showTagline && (
        <div className="brand-tagline">
          <span className="brand-line" />
          <span className="brand-tagline-text">BUILD. DEPLOY. EVOLVE.</span>
          <span className="brand-line" />
        </div>
      )}

      {showReflection && size === "xl" && (
        <div
          aria-hidden
          className="brand-reflection"
          style={{ fontSize: px, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.04em" }}
        >
          <span className="brand-v">V</span>
          <span className="brand-forge">
            <span className="brand-letter">F</span>
            <span className="brand-ring" />
            <span className="brand-letter">r</span>
            <span className="brand-letter">g</span>
            <span className="brand-letter">e</span>
          </span>
        </div>
      )}
    </div>
  );
}
```

Step 3. Append (or replace) these styles in app/globals.css under the
existing token definitions:

```css
[data-theme="dark"] {
  --metal: linear-gradient(180deg, #f7f7f7 0%, #d8d8d8 28%, #8a8a8a 52%, #c8c8c8 76%, #4b4b4b 100%);
  --metal-shadow: 0 1px 0 rgba(0,0,0,0.6);
}
[data-theme="light"] {
  --metal: linear-gradient(180deg, #1f1f1f 0%, #4a4a4a 28%, #6a6a6a 52%, #3a3a3a 76%, #0d0d0d 100%);
  --metal-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

.brand-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 0.04em;
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
.brand-letter,
.brand-v {
  background: var(--metal);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(var(--metal-shadow));
}
.brand-v {
  position: relative;
  display: inline-block;
  transform: skewX(-10deg);
  padding: 0 0.12em;
  margin-right: 0.08em;
}
.brand-v::before,
.brand-v::after {
  content: "";
  position: absolute;
  top: -8%;
  width: 3px;
  height: 116%;
  background: var(--green);
  box-shadow: 0 0 14px var(--green-glow), 0 0 28px var(--green-glow);
  border-radius: 1.5px;
}
.brand-v::before { left: 0; }
.brand-v::after  { right: 0; }

.brand-forge {
  display: inline-flex;
  align-items: center;
}
.brand-ring {
  position: relative;
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
  margin: 0 0.04em;
  border: 0.08em solid var(--green);
  border-radius: 50%;
  box-shadow:
    0 0 10px var(--green-glow),
    0 0 22px var(--green-glow),
    inset 0 0 6px var(--green-soft);
}
.brand-ring::before {
  content: "";
  position: absolute;
  top: -0.22em;
  left: 50%;
  transform: translateX(-50%);
  width: 0.12em;
  height: 0.32em;
  background: var(--green);
  border-radius: 1px;
  box-shadow: 0 0 6px var(--green-glow);
}
.brand-ring::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0.18em;
  height: 0.18em;
  transform: translate(-50%, -50%);
  background: var(--green);
  border-radius: 50%;
  box-shadow: 0 0 4px var(--green-glow);
}

.brand-tagline {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.4em;
  color: var(--green-text);
  text-transform: uppercase;
}
.brand-line {
  width: 32px;
  height: 1px;
  background: var(--green-text);
  position: relative;
}
.brand-line::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--green);
  transform: translateY(-50%);
}
.brand-line:first-child::after { right: -2px; }
.brand-line:last-child::after  { left:  -2px; }

.brand-reflection {
  margin-top: 6px;
  transform: scaleY(-1);
  opacity: 0.18;
  filter: blur(0.5px);
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%);
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.6), transparent 70%);
  pointer-events: none;
}
[data-theme="light"] .brand-reflection { opacity: 0.10; }

[data-theme="light"] .brand-v::before,
[data-theme="light"] .brand-v::after {
  box-shadow: 0 0 10px var(--green-glow), 0 0 18px var(--green-glow);
}
[data-theme="light"] .brand-ring {
  box-shadow:
    0 0 6px rgba(124,255,60,0.35),
    inset 0 0 4px rgba(124,255,60,0.18);
}
```

Step 4. Verify the topbar imports <Brand /> from "@/components/shell/brand"
and renders <Brand size="sm" />. If it imports from any other path, fix it.

Step 5. Render the 4 sizes vertically at the bottom of the v0 preview:

```tsx
<div className="bg-bg p-12 space-y-10 flex flex-col items-center">
  <Brand size="sm" />
  <Brand size="md" />
  <Brand size="lg" showTagline />
  <Brand size="xl" showTagline showReflection />
</div>
```

Do NOT keep brackets around the "V" (no `[V]` notation). Do NOT use
plain Geist text. The wordmark must use the metallic gradient via
-webkit-background-clip: text.
````

---

## 9) ☢️ Mascota "nuclear" — verifica el archivo Y cablea el bottom nav

> El bottom nav muestra un círculo verde sólido sin ojitos. Probable: el ForgeOrb usa `var(--green)` strokes sobre fondo verde → invisible. Solución: prop `onGreen` que pinta los strokes de negro.

````
NUCLEAR — the FORGE tab in the bottom nav currently renders an empty
green circle. The ForgeOrb component is either missing or its strokes
are var(--green) on top of a green button → invisible. Fix in three
surgical steps.

Step 1 — VERIFY OR CREATE components/ui/forge-orb.tsx with this EXACT
code (overwrite if it exists):

```tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type ForgeOrbProps = {
  size?: number;
  state?: "idle" | "loading" | "happy" | "error";
  glow?: boolean;
  onGreen?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function ForgeOrb({
  size = 96,
  state = "idle",
  glow = true,
  onGreen = false,
  className,
  ariaLabel = "Forge",
}: ForgeOrbProps) {
  const reduce = useReducedMotion();
  const stroke = onGreen
    ? "#000"
    : state === "error"
    ? "var(--error)"
    : "var(--green)";
  const cutoutFill = onGreen ? "var(--green)" : "var(--bg)";

  const [look, setLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (reduce || state === "happy") return;
    const targets = [
      { x: 0, y: 0 }, { x: -4, y: 0 }, { x: 0, y: 0 },
      { x: 4, y: 0 }, { x: 0, y: 3 }, { x: 0, y: -3 },
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % targets.length;
      setLook(targets[i]);
    }, 1400 + Math.random() * 1600);
    return () => clearInterval(id);
  }, [reduce, state]);

  const eyeY = state === "happy" ? 2 : look.y;
  const eyeX = state === "happy" || state === "error" ? 0 : look.x;
  const eyeScaleY = state === "happy" ? 0.5 : 1;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        filter: onGreen
          ? "none"
          : "drop-shadow(0 0 10px var(--green-glow)) drop-shadow(0 0 22px var(--green-glow))",
      }}
    >
      {glow && !onGreen && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: "-30%",
            background: "radial-gradient(closest-side, var(--green-glow), transparent 70%)",
            opacity: 0.45,
            pointerEvents: "none",
          }}
        />
      )}
      <svg viewBox="0 0 200 200" width={size} height={size} fill="none">
        <motion.g
          animate={
            state === "loading" && !reduce ? { rotate: 360 }
            : state === "error" && !reduce ? { scale: [1, 1.05, 1] }
            : { rotate: 0 }
          }
          transition={
            state === "loading" ? { repeat: Infinity, ease: "linear", duration: 1.6 }
            : state === "error" ? { repeat: Infinity, duration: 0.8 }
            : { duration: 0 }
          }
          style={{ transformOrigin: "100px 100px" }}
        >
          <path d="M 100,20 A 80,80 0 1,1 99.99,20" stroke={stroke} strokeWidth="6" strokeLinecap="round" fill="none" />
          <circle cx="100" cy="100" r="72" stroke={stroke} strokeOpacity="0.45" strokeWidth="1.2" fill="none" />
          <rect x="98.5" y="10" width="3" height="14" rx="1.5" fill={stroke} />
          <rect x="96" y="20" width="8" height="6" fill={cutoutFill} />
        </motion.g>

        <motion.g
          animate={{ x: eyeX, y: eyeY, scaleY: eyeScaleY }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: "100px 100px" }}
        >
          <motion.g
            animate={!reduce && state !== "happy" ? { scaleY: [1, 1, 0.08, 1, 1] } : { scaleY: 1 }}
            transition={
              !reduce && state !== "happy"
                ? { repeat: Infinity, duration: 5.5, times: [0, 0.93, 0.96, 0.99, 1], ease: "easeInOut" }
                : { duration: 0 }
            }
            style={{ transformOrigin: "100px 100px" }}
          >
            <rect x="82" y="80" width="8" height="40" rx="4" fill={stroke} />
            <rect x="110" y="80" width="8" height="40" rx="4" fill={stroke} />
          </motion.g>
        </motion.g>
      </svg>
    </span>
  );
}
```

Step 2 — Open components/shell/mobile-nav.tsx. Find the FORGE tab
(elevated center button with bg-green). Whatever is inside it (Sparkles,
Zap, blank, or nothing), DELETE it and replace with this exact JSX:

```tsx
import { ForgeOrb } from "@/components/ui/forge-orb";

// inside the FORGE tab button:
<ForgeOrb size={32} state="idle" glow={false} onGreen ariaLabel="Forge" />
```

The `onGreen` prop renders the orb in BLACK strokes so it reads
against the lime button background. That's the bug fix.

Step 3 — Search the codebase for these icons and replace each with
<ForgeOrb /> at the appropriate size:
  · `<Sparkles ... />` next to "FORGE" header in chat messages →
    <ForgeOrb size={14} state="idle" glow={false} className="inline-block align-[-2px]" />
  · `<Loader2 ... />` or generic spinner inside /forge "Building
    en Vercel..." row →
    <ForgeOrb size={20} state="loading" glow={false} />
  · Any empty-state placeholder on /vision, /hunter, /scout →
    <ForgeOrb size={120} state="idle" />

Do NOT leave Sparkles, Zap, Power, Loader2, or Circle as a substitute
for the mascot anywhere.

Render at the bottom of preview:
```tsx
<div className="bg-bg p-12 grid grid-cols-5 gap-8 place-items-center">
  <ForgeOrb size={96} state="idle" />
  <ForgeOrb size={96} state="loading" />
  <ForgeOrb size={96} state="happy" />
  <ForgeOrb size={96} state="error" />
  <div className="bg-green p-3 rounded-full inline-flex">
    <ForgeOrb size={32} state="idle" glow={false} onGreen />
  </div>
</div>
```
The last cell verifies the on-green variant renders correctly.
````

---

## 10) Contraste de textos verdes — apagar la fluorescencia

> Para los labels que se ven "fosforescentes" en dark mode (Ver todos, +1 esta semana, etc.). Introduce un verde gemelo más calmado, sin tocar el verde principal.

````
Audit and fix green text contrast / readability.

The token --green #7CFF3C has 14.5:1 contrast on black (WCAG AAA),
but it's hyper-saturated lime. On dark mode it screams. The fix is
NOT to change --green — it must stay loud for dots, fills, ring
strokes and CTAs. Instead, introduce a quieter sibling for body text.

Step 1 — Add to globals.css under the existing token blocks:

```css
:root {
  --green-quiet: #A8E682;  /* desaturated, comfortable for body labels */
}
[data-theme="light"] {
  --green-quiet: #4F9B2F;  /* darker for AA contrast on white */
}
```

Step 2 — Replace --green with --green-quiet in these contexts ONLY:
  · "Ver todos" / "Ver más" link text
  · stat-card delta lines: "+1 esta semana", "últimos 30 días"
  · in-card subtle annotations like "12 ok · 2 fallidos"
    (this one stays --warning, it's a mixed-status indicator;
    if currently green, switch to --warning)
  · sidebar group labels (CONTROL / HERRAMIENTAS / SISTEMA) —
    keep them --fg-2 (gray), NEVER green
  · activity-row time stamps: --fg-2, never green
  · empty-state subtitles: --fg-1
  · brand <Brand /> tagline "BUILD. DEPLOY. EVOLVE."
  · mobile bottom nav active tab label

Step 3 — KEEP --green (loud) ONLY in:
  · status pill "live" dot + text
  · stat-card icons (top-left of each card)
  · primary CTA buttons (bg-green text-black)
  · brand <Brand /> rails and ring
  · ForgeOrb strokes
  · Forge chat message left-border accent
  · Filter chip when active (bg-green-dim border-green text-green-quiet)

Step 4 — Self-audit: search the codebase for `text-green`,
`text-[var(--green)]`, `color: var(--green)`. Each match must be
either (a) one of the sanctioned loud uses above, or (b) replaced
with --green-quiet.

Result: the dashboard should feel ~30% calmer on dark mode while
keeping the lime energy in the right places (status, CTAs, brand).
The light mode also benefits because --green-quiet at #4F9B2F has
4.6:1 on white.
````

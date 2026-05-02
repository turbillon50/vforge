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
Fix the mobile bottom nav. 5 tabs: Hub · Proyectos · FORGE (raised) · Bóveda · Módulos. The center FORGE tab must be a circular button with margin-top: -16px, bg --green, text black, 4px solid --bg ring (so it pops above the bar), and a pulsing green-glow shadow. Icon: Sparkles (lucide). The other 4 tabs are flat: small icon top + label below (10px mono uppercase). Active tab: text white. Inactive: text --fg-2.
```

### Si v0 mete dependencias raras
```
Use only shadcn/ui primitives plus framer-motion and lucide-react. No other UI libraries (no MUI, no Chakra, no Mantine, no styled-components, no emotion). All icons must come from lucide-react.
```

---

## 5) Logo `<Brand />` — versión "VForge premium"

> En v0: abre el componente `<Brand />` que ya generó, **adjunta la referencia visual `vforge-logo.png`** y pega este prompt.

````
Replace the existing <Brand /> component with a faithful CSS recreation of
the attached reference image. Build it as a single self-contained React
component, no images, no SVG sprites — pure CSS + a tiny inline SVG only
for the ring's "tab" notch if needed.

# VISUAL TARGET (per the attached image)
- Pure black background.
- Large word-mark "VForge" in chrome / brushed-aluminium typography:
  · "V" leans slightly italic (skewX(-10deg)), thick stroke.
  · "Forge" letters: clean tight tracking, slight bevel/3D.
  · Both V and Forge use the SAME metallic gradient:
      background: linear-gradient(180deg,
        #f7f7f7 0%,
        #d8d8d8 28%,
        #8a8a8a 52%,
        #c8c8c8 76%,
        #4b4b4b 100%);
      -webkit-background-clip: text;
      color: transparent;
      filter: drop-shadow(0 1px 0 rgba(0,0,0,0.6));
- Around the "V": two vertical lime-green light-bars (left + right edge),
  not skewed brackets — they look like neon rails that the V sits between.
  Each bar:  width 3px, height ~115% of the V, background var(--green) #7CFF3C,
  box-shadow: 0 0 14px var(--green-glow), 0 0 28px var(--green-glow).
  They sit just outside the V's silhouette, slightly inclined to follow
  the V's italic angle.
- The "o" in "Forge" is REPLACED with a glowing green power-button ring:
  · Outer ring: 0.85em diameter, 2px solid var(--green), border-radius 50%.
  · Box-shadow: 0 0 10px var(--green-glow), 0 0 22px var(--green-glow), inset 0 0 6px var(--green-soft).
  · A vertical "tab" notch breaks the top of the ring: a 2px-wide × 6px-tall
    lime-green slit centered at top, with the same glow. Implement as a
    `::before` pseudo placed over the top edge to mask + redraw the slit.
  · A tiny solid green dot lives in the very center of the ring (4px circle,
    solid green, glow), to match the reference (looks like the LED indicator).
- Tagline beneath: small mono uppercase "BUILD. DEPLOY. EVOLVE." in
  var(--green), letter-spacing 0.4em, font-size 11px, font-weight 500.
  Flank the tagline with two thin horizontal green lines (1px, 32px wide),
  each ending in a tiny green dot — exactly like the reference.
- Subtle reflection beneath the wordmark (NOT the tagline): use
  `transform: scaleY(-1)` of a copy with mask-image gradient fading to
  transparent, opacity 0.18, blur 0.5px. Keep it subtle.

# COMPONENT API
```tsx
type BrandProps = {
  size?: "sm" | "md" | "lg" | "xl";  // sm=topbar, md=sidebar, lg=hero, xl=splash
  showTagline?: boolean;             // default true on lg/xl, false on sm/md
  showReflection?: boolean;          // default true only on xl
  className?: string;
};
```

Sizes (font-size for the wordmark):
  sm: 16px, md: 22px, lg: 40px, xl: 72px.

# DON'T
- Do NOT use any other accent color. Only lime green #7CFF3C glows.
- Do NOT add background image, gradient, or vignette to the component
  itself — the parent supplies the black bg.
- Do NOT use a real <img> or external SVG. Pure CSS + minimal inline pseudo-elements.
- Do NOT animate the logo here (the mascot does the animation; this stays static).

Render the component inside a centered black <div className="bg-bg p-16">
preview so I can see it at all four sizes stacked vertically.
````

---

## 6) Mascota / Loader `<ForgeOrb />` — con expresión y ojitos animados

> En v0: crea un componente nuevo `<ForgeOrb />`, **adjunta la referencia visual `forge-orb-blue.png`** (la versión azul) y pega este prompt. v0 va a recrearla en verde con animaciones.

````
Create a new component called <ForgeOrb /> based on the attached
reference image (a glowing circular character with a small tab notch on
top and two vertical "eye" bars inside). The reference is BLUE — recreate
it in lime green #7CFF3C to match the vForge brand. It will be used as:
  · the loader on /forge while Forge is "thinking"
  · the empty-state mascot on /vision, /hunter, /scout
  · the favicon (static SVG export)
  · the avatar on Forge chat messages
This is the "soul" of the app, so animation matters.

# VISUAL SPEC (recreate the attached image, GREEN)
- SVG-based React component, viewBox="0 0 200 200", responsive width.
- The body is a circular ring:
  · Outer circle: cx=100 cy=100 r=80, stroke=var(--green) #7CFF3C,
    stroke-width=6, fill=none.
  · Add an inner subtle ring at r=72, stroke-width=1, opacity=0.5,
    same green — gives the double-line feel of the reference image.
  · Add a "tab" notch on the top center: a small gap in the outer
    circle from 88° to 92° (use stroke-dasharray or two arcs), and
    above it draw a 2px × 10px green vertical slit centered at x=100, y=18.
- Inside the ring, two vertical "eye" capsules:
  · Left eye:  x=82  y=80  width=8  height=40  rx=4  fill=var(--green)
  · Right eye: x=110 y=80  width=8  height=40  rx=4  fill=var(--green)
  · Each eye must be its own <rect> wrapped in a <g class="eye"> so we
    can transform them independently.
- Glow: apply an SVG <filter> using feGaussianBlur (stdDeviation 2.5)
  + feMerge, attached to BOTH the ring and the eyes.
  Also apply CSS filter: drop-shadow(0 0 12px var(--green-glow))
  drop-shadow(0 0 22px var(--green-glow)) on the parent <svg>.
- Outside the SVG, on the parent wrapper: a subtle radial-gradient
  background-glow circle (200% size, opacity 0.18, fading to transparent)
  so the orb feels like it lives in space — but only when prop `glow`
  is true.

# ANIMATIONS (this is the magic — make it feel alive)
Use framer-motion for the eye <g> elements. Behavior loop:

1. **Idle look-around** (default infinite loop):
   Sequence with random pauses between 1.5s and 4s:
   - look center (translate 0,0)  → hold 2s
   - look left   (translate -4,0) → hold 1.2s
   - look center                 → hold 1.6s
   - look right  (translate +4,0) → hold 1.4s
   - look down   (translate 0,+3) → hold 1.0s
   - look up     (translate 0,-3) → hold 1.2s
   Use `transition: { duration: 0.25, ease: [0.4,0,0.2,1] }` between targets.
   Both eyes move together (group transform).

2. **Blink** (interrupts the loop every 4–7s, randomized):
   Animate `scaleY` of the eye group: 1 → 0.08 → 1, total 180ms,
   easeInOut. Both eyes blink in sync.

3. **Squint / smile** (when prop `mood="happy"`):
   eyes scaleY 0.5, translateY +2, hold. Used by /forge after
   successful deploy.

4. **Spin** (when prop `state="loading"`):
   The OUTER ring rotates 360° infinite, 1.6s linear. Eyes keep
   doing the idle look-around independently — feels like the orb is
   processing while still aware of you.

5. **Pulse** (when prop `state="error"`):
   Tint the green to var(--error) #F31260, eyes do quick scaleY
   0.3 / 1 / 0.3 / 1 (concerned blink), and the whole orb pulses
   scale 1 → 1.05 → 1 every 800ms.

6. **Hover follow-cursor** (always on if `interactive` prop):
   On mouse move within 200px of the orb, eyes translate up to
   ±6px in the direction of the cursor. Use `useMotionValue` +
   `useSpring(stiffness: 120, damping: 20)`. On mouse leave, return
   to idle loop.

# COMPONENT API
```tsx
type ForgeOrbProps = {
  size?: number;                                    // px, default 96
  state?: "idle" | "loading" | "happy" | "error";   // default "idle"
  mood?: "neutral" | "happy" | "concerned";         // overrides eye expression
  glow?: boolean;                                   // background glow halo, default true
  interactive?: boolean;                             // follows cursor, default false
  className?: string;
  ariaLabel?: string;                                // default "Forge"
};
```

# ACCESSIBILITY
- Wrap SVG with role="img" and aria-label from props.
- If user has prefers-reduced-motion, disable the rotation, the cursor
  follow and the random look-around — keep only a slow blink every 4s.

# WHERE TO USE IT
At the bottom of the file, export 4 demo blocks for the v0 preview:

  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-12 bg-bg">
    <ForgeOrb size={120} />                              // idle
    <ForgeOrb size={120} state="loading" />              // ring spinning
    <ForgeOrb size={120} state="happy" />                // post-deploy
    <ForgeOrb size={120} state="error" />                // build failed
  </div>

Then wire it into:
  · /forge — show <ForgeOrb state="loading" /> in place of typing indicator
    while a Forge message is streaming.
  · /vision, /hunter, /scout — empty-state hero shows <ForgeOrb size={160} interactive />
  · Forge chat avatar — small <ForgeOrb size={28} />
  · Favicon — export static SVG (no animation) of the same shape.

# DON'T
- Do NOT use a PNG/JPG — pure SVG.
- Do NOT use any other color than green/error variants.
- Do NOT make the eyes circular dots — they're vertical capsules,
  rounded ends, just like the reference image.
- Do NOT animate by re-rendering — use framer-motion / CSS transforms only.
- Keep the API typed strictly, no `any`.
````

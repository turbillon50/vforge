# El Método vForge

> *Cómo construyo apps. Sigue este manual y replicas el mismo nivel de calidad, velocidad y seguridad — para vForge, para los proyectos del catálogo (Castores, VanDeFi, URMAH, Movee, Jobber, etc.) o para clientes externos.*

**Autor:** Luis Humberto de la Torre Herrera · All Global Holding LLC / MIRMAR EMPRESAS S.A. de C.V.
**Última revisión:** 2026-05-03

---

## En 30 segundos

vForge construye apps premium en horas, no semanas, orquestando agentes IA especializados (cada uno en lo que es bueno) bajo un protocolo documentado. Una app pasa por **7 fases**, cada una con responsabilidades claras: qué hace el operador (humano), qué hace el agente IA (autónomo), qué credenciales se necesitan, qué queda documentado.

El método **NO es un framework** — es un manual operativo. La fábrica nace de la disciplina con la que se aplica.

---

## Las 7 fases

```
1. Concepción visual         → ChatGPT image gen + Claude planner
2. Brief denso               → Claude planner produce el master prompt
3. Generación visual         → v0.dev construye el frontend (75% del visual)
4. Refinamiento              → Iteración en v0 con prompts capa 1
5. Correctivos quirúrgicos   → Cuando v0 ignora, JSX literal (capa 2)
6. Handoff a código          → Sync v0 → repo, audit, commits atómicos
7. Integraciones de infra    → Domain, DB, Auth, model providers
```

Después: **Cerebro Forge** (M0–M11), monetización, escalado.

---

## Stack obligatorio (no negociar sin ADR)

```
Framework:        Next.js 16 App Router · TypeScript estricto · Turbopack
React:            19
Estilos:          Tailwind CSS 4 (sintaxis @theme inline) · shadcn/ui
Animación:        framer-motion 12
Iconos:           lucide-react
Tema:             next-themes (data-theme attribute)
Auth:             Clerk (instancia centralizada, satellite domains)
Database:         Neon Postgres serverless
Hosting:          Vercel (auto-deploy en cada push)
Models:           Anthropic + OpenAI + Gemini + Perplexity (multi-modelo, routing inteligente)
Repo:             GitHub bajo turbillon50/
Package manager:  npm
```

---

## Roles del cast

| Agente | Su rol | Cuándo entra |
|---|---|---|
| **Luis (humano)** | Director de producto, decisiones, criterio visual, revisa avisos de Anillo 3 y audita el log | Siempre |
| **ChatGPT image gen** | Mockups, logos, mascotas | Concepción visual |
| **Claude planner** (claude.ai) | Sistemas, briefs, prompts maestros | Inicio del proyecto |
| **Claude Code** (este agente) | Repo, git, GitHub, docs, prompts refinados, integraciones, código | Capa 3 — todo lo no-visual |
| **v0.dev** | Generación visual del frontend | Capa 1 — layouts, screens, copy |
| **Vercel + Name.com + Neon + Clerk** | Infraestructura | Fase 7 |
| **Forge AI (futuro)** | Reemplaza el orquestamiento manual | Después de M11 |

---

## El modelo de las 3 capas (cuándo usar qué)

```
CAPA 1 — Prompt descriptivo en v0 (default)
         Layout, copy, microinteracciones comunes, theme tokens.
         v0 puede MEJORAR tu idea.

CAPA 2 — Prompt con JSX/CSS literal en v0
         Cuando v0 ignoró 2× la descripción, o la geometría es más
         rápida en código. Bloquea creatividad pero garantiza precisión.

CAPA 3 — Código directo en el repo (Claude Code)
         Configs, refactors cross-file, CI, deps, git ops, docs,
         integraciones de infra, cripto, backend.
```

**Regla de oro:** empezar siempre por la capa más baja. Subir solo cuando la anterior demostró que falla.

---

## Lo que el operador (humano) hace en cada fase

| Fase | Lo que hace Luis | Por qué |
|---|---|---|
| **1. Concepción visual** | Genera mockups del logo, mascota, mood en ChatGPT | Decisión de marca, criterio de producto |
| **2. Brief denso** | Aprueba el master prompt antes de pasarlo a v0 | Última oportunidad de pivote barato |
| **3. Generación visual** | Pega prompts en v0, da feedback coloquial, itera | El gusto sigue siendo humano |
| **4. Refinamiento** | Decide qué se afina y qué queda como está | Calidad subjetiva |
| **5. Correctivos** | Identifica qué no cuajó, autoriza prompt nuclear | Veto humano sobre el JSX literal |
| **6. Handoff** | Hace `Sync to GitHub` desde v0 | Anillo 1 técnico (botón v0) |
| **7. Integraciones** | **Genera tokens scope-limited** y los manda al chat | Anthropic/Claude policies + estándar de seguridad |
| **M0 — Vault** | Crea su Vault Master Password + descarga backup codes | Zero-knowledge: Claude jamás ve la clave |
| **M2/M3 cerebro** | Revisa los avisos de Anillo 3 que V emite al ejecutar | Trazabilidad — audit log + revert (ver ADR-010) |
| **Producción** | Decide cuándo abrir registro a clientes externos | Decisión de negocio |

**Lo que NUNCA hace Luis manualmente** (todo automatizado por Claude Code o Forge AI):
- Configurar DNS records en Name.com
- Crear proyectos / env vars en Vercel
- Crear schemas / migraciones en Neon
- Agregar dominios satélite en Clerk (excepto el primer setup en dashboard)
- Cualquier git op (commits, PRs, branches)
- Verificación de rutas / Lighthouse / contraste

---

## Credenciales canónicas que cada app del catálogo necesita

```
Hosting              VERCEL_TOKEN                  team-scoped
Repo                 (gestionado por GitHub MCP)
Dominio              NAME_USERNAME + NAME_TOKEN    domain-scoped si posible
Database             DATABASE_URL                  Neon connection string
                     NEON_API_KEY                  para branching automático
Auth                 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
                                                    instancia compartida del portafolio
Modelos              ANTHROPIC_API_KEY
                     OPENAI_API_KEY
                     GEMINI_API_KEY
                     PERPLEXITY_API_KEY
Vault                VFORGE_MASTER_PEPPER          server-side, jamás cambia (rotación = re-cifrar todo)
                     (cada usuario aporta su VAULT_PASSWORD en cliente)
```

**Total: 11 env vars en Vercel + Vault password per-user en cliente.**

---

## Documentos foundacionales (lectura obligatoria para cualquier agente entrando)

```
README.md                     entry point, surfaces docs principales
AGENTS.md                     protocolo multi-agente (roles, capas, anillos)
docs/playbook.md              manual operativo extendido (todas las fases en detalle)
docs/architecture.md          arquitectura del cerebro Forge (post-M0)
docs/decisions/               8 ADRs canónicos
docs/integrations/            runbooks por proveedor (Name.com, Neon, Clerk, model-providers)
docs/visual-refs/             memoria visual del proyecto
docs/v0-prompt.md             prompts canónicos para v0.dev
```

---

## Cuándo aplicar este método

| Tipo de proyecto | Aplicabilidad | Adaptaciones |
|---|---|---|
| Dashboard SaaS interno | ✅ Tal cual | Ninguna |
| PWA cinematográfica | ✅ Con extensión | Agregar Capacitor + WebGL pipeline |
| Marketing site | ⚠️ Adaptar | Quita la mascota; conserva tokens y tipografía |
| E-commerce | ⚠️ Adaptar | Conserva sistema de marca; agrega Stripe + carrito |
| Backend solo | ❌ No aplica | Este método es de UI |

---

## Casos donde Claude **no puede** y se hace manual

Algunas tareas las bloquean Anthropic policies o limitaciones técnicas. **No es un bug, es por diseño** — el humano debe hacer el último click. Lista exhaustiva:

| Tarea | Por qué manual | Cómo |
|---|---|---|
| **Generar API tokens** en Vercel, Name.com, Neon, Clerk, Anthropic, OpenAI, etc. | Cada provider exige login en su dashboard | Operador genera con scope mínimo, los pega en chat |
| **Comprar dominios** | Compromiso financiero | Operador compra en Name.com (~$3-25/año) |
| **Pagar plans de Vercel/Neon/Clerk** cuando Free se queda corto | Compromiso financiero | Operador upgrade desde dashboard |
| **Revisar avisos de Anillo 3** en `/forge` chat | Trazabilidad — V ejecuta + avisa, el freno es el audit log (ver ADR-010) | Operador lee el aviso; revert si hace falta |
| **Crear su Vault Master Password** | Zero-knowledge — Claude jamás ve la clave | Operador la teclea en cliente |
| **Guardar backup codes** del Vault | Zero-knowledge — single source of truth physical | Operador los descarga, los imprime, los guarda |
| **Conectar el primer dominio satélite en Clerk dashboard** | Política de Clerk requiere consola | Operador hace 5 clicks una vez por proyecto |
| **Decidir si una key debe rotarse** después de incidente | Decisión de seguridad operacional | Operador valora urgencia, autoriza |
| **Aceptar Terms of Service** de proveedores nuevos | Compromiso legal | Operador lee, acepta |
| **Subir SVGs / imágenes originales** a `docs/visual-refs/` | Claude no genera imágenes nativamente | Operador los exporta de ChatGPT/Figma |

**Para todo lo demás, hay un runbook en `docs/integrations/{provider}.md`** que Claude ejecuta vía API en segundos.

---

## Métricas de calidad de un build vForge (quality gates)

Antes de declarar `done` un proyecto:

- [ ] `npm run build` verde
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run lint` 0 errors (warnings tolerables)
- [ ] CI passing (GitHub Actions)
- [ ] 13+ rutas estáticas devolviendo 200
- [ ] Lighthouse mobile ≥ 90 (performance, accessibility, best practices)
- [ ] Contraste WCAG AA en ambos temas
- [ ] PWA installable (manifest + maskable icons)
- [ ] OG image renderiza al pegar URL en WhatsApp / Slack
- [ ] Custom domain con SSL activo
- [ ] DB conectada con env vars encriptados
- [ ] Auth funcional (sign-in + sign-up + protected routes)
- [ ] Vault funcional (zero-knowledge, backup codes generados)

---

## Ejemplo: cuánto tarda construir una app del catálogo siguiendo el método

| App | Fases 1–7 | M0–M11 cerebro | Total |
|---|---|---|---|
| vForge (esta) | ~5h | ~17 días enfocados (estimado) | ~3 semanas |
| Castores (re-skin si tuviera el método) | ~3h | reutilizar adapters | ~1 semana |
| Cliente externo nuevo (10ª app) | ~2h | reutilizar todo | ~3 días |

**El método se vuelve más rápido con cada proyecto.** Los runbooks, ADRs, plantillas y experiencia del operador son activos acumulables.

---

## Cómo evolucionar el método

1. Cada nuevo proyecto agrega aprendizajes a `docs/playbook.md` §9 (lessons learned).
2. Decisiones arquitectónicas estructurales abren un ADR nuevo en `docs/decisions/`.
3. Integraciones nuevas dejan su runbook en `docs/integrations/`.
4. Versionar el método con tags git (`method-v1`, `method-v2`).

**El día que Forge AI esté funcional (post-M11), este método se ejecuta autónomo.** Hoy lo ejecuta Luis + Claude Code; mañana lo ejecuta Forge + Luis solo en los pasos manuales irreductibles.

---

## Referencias

- Manual extendido: [`docs/playbook.md`](./playbook.md)
- Arquitectura del cerebro: [`docs/architecture.md`](./architecture.md)
- Protocolo multi-agente: [`../AGENTS.md`](../AGENTS.md)
- Runbooks por proveedor: [`docs/integrations/`](./integrations/)
- Decisiones documentadas: [`docs/decisions/`](./decisions/)

---

> *Esta es la fábrica documentada. Si el método se sigue con disciplina, vForge convierte ideas en apps premium con costo y tiempo predictibles. Si se atajan pasos, se rompe la promesa.*

# VFORGE ASSEMBLER — Spec Ejecutable

> "De idea a app en producción, cero defectos, orquestado por V"

**Versión:** 0.1.0
**Autor:** Luis de la Torre (Jimmy)
**Fecha:** 2026-07-02
**Repo destino:** `turbillon50/vforge`
**QA:** `turbillon50/copy-paste-` (vforge-live)

---

## 1. Qué es esto

El Assembler es el motor central de VForge — la pieza que transforma cualquier entrada
(una idea, un logo, un chat, un ZIP, un mockup de Figma) en una app completa desplegada
en producción con admin, backend por roles, multitenant, y cero defectos verificados.

V es la directora de orquesta. No genera código ella misma — mueve entre 5 y 15
agentes por turno (Grok, Codex, Claude Code) y asigna GPUs del mesh a discreción
según la carga. Cada agente recibe una tarea atómica con contrato de entrada/salida.
V decide quién hace qué, verifica el resultado, y reasigna si falla.

---

## 2. Arquitectura — las 4 capas

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1 — CAPTURA                                       │
│  Entrada libre: idea, logo, chat, ZIP, Figma, brief     │
│  V decide qué generador usar:                           │
│    v0 · Stitch · Claude Design · template propio ·      │
│    Hetzner GPU · catálogo VForge                         │
│  Salida: frontend normalizado (HTML/React/Next.js)      │
├─────────────────────────────────────────────────────────┤
│  CAPA 2 — ENSAMBLAJE (este documento)                   │
│  V orquesta 5-15 agentes por turno                      │
│  Scaffold Next.js + inject frontend + generate backend  │
│  por roles + inject admin module + wire auth/DB/tokens   │
│  Salida: proyecto Next.js completo en rama staging       │
├─────────────────────────────────────────────────────────┤
│  CAPA 3 — OJO (vforge-live / copy-paste-)               │
│  Dispositivos virtuales, video, visual-diff, a11y       │
│  Loop cero-defectos: test → classify → fix → retest     │
│  deployGate() bloquea si defectos >= umbral              │
│  Salida: reporte HTML con video + decisión promote/block │
├─────────────────────────────────────────────────────────┤
│  CAPA 4 — ENTREGA                                       │
│  Merge a main · deploy Vercel prod · dominio del cliente │
│  Admin vive en VForge, espejo por hostname               │
│  Smoke test post-deploy · 600+ integraciones activables  │
│  Salida: app en producción con URL del cliente           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. V como orquestadora — swarm de agentes

### 3.1 Pool de agentes disponibles

| Agente | Fortaleza | Uso ideal | Fuente |
|---|---|---|---|
| Claude Code | Razonamiento largo, arquitectura | Scaffold, wiring, middleware, lógica | Anthropic API |
| Grok | Velocidad, auditoría, review | Gate de código, lint, revisión de PR | Hetzner (nvm) |
| Codex | Generación bulk, completions | CRUD repetitivo, modelos Prisma, tests | OpenAI API |

### 3.2 Reglas de orquestación de V

- **Presupuesto por turno.** V dispone de 5 a 15 agentes simultáneos por turno de
  ensamblaje. El número exacto lo decide V según complejidad del proyecto.
- **Nunca paralelo sobre el mismo archivo.** Si dos agentes necesitan tocar el mismo
  archivo, V los serializa. Cada agente trabaja en su scope (carpeta/módulo) aislado.
- **Contrato atómico.** Cada tarea que V despacha a un agente tiene:
  - `INPUT`: qué archivos/contexto recibe
  - `OUTPUT`: qué archivos debe producir
  - `GATE`: condición de aceptación (compila, pasa lint, test unitario)
  - `ROLLBACK`: si falla el gate, se descarta el output completo
- **Reasignación.** Si un agente falla 2 veces la misma tarea, V la reasigna a otro
  agente de diferente tipo (ej: Grok falló → Claude Code toma el relevo).
- **GPU dinámica.** V puede mover GPUs del mesh (Vast.ai RTX 5090, Hetzner local)
  para acelerar inferencia de los agentes locales. Decisión basada en cola de tareas:
  - < 5 tareas pendientes → 1 GPU suficiente
  - 5-10 tareas → V levanta GPU adicional si hay disponible
  - 10 tareas → V activa todas las GPUs disponibles y balancea
- **Sin deploy a prod sin orden de Luis.** V puede construir, testear, generar previews,
  pero el push final a producción requiere aprobación explícita del owner.

### 3.3 Flujo de un turno de ensamblaje

```
Luis dice: "Quiero una app de renta de autos, logo adjunto, roles: admin/agente/cliente"

V analiza el input:
  → Logo detectado (imagen) → manda a Claude Design para brand kit
  → Idea "renta de autos" → manda a v0 para generar landing + flujos principales
  → Roles definidos: admin, agente, cliente

V planifica el turno (decide 8 agentes para este proyecto):
  ┌─ Agente 1 (Claude Code): scaffold Next.js + estructura base
  ├─ Agente 2 (Codex): modelos Prisma por roles (Vehicle, Rental, User, etc.)
  ├─ Agente 3 (Codex): API routes CRUD para cada modelo
  ├─ Agente 4 (Claude Code): middleware de permisos por rol
  ├─ Agente 5 (Claude Code): inject admin module (componente versionado)
  ├─ Agente 6 (Claude Code): integrar frontend de v0 como páginas
  ├─ Agente 7 (Grok): auditar todo el código generado (lint + security)
  └─ Agente 8 (Grok): correr build gate (npm run build + typecheck)

Secuencia:
  Fase A (paralelo): Agentes 1, 2 corren simultáneo (no comparten archivos)
  Fase B (paralelo): Agentes 3, 4, 5 (dependen de schema de Fase A)
  Fase C (paralelo): Agente 6 (depende de scaffold de Fase A)
  Fase D (serial): Agente 7 audita → Agente 8 corre build
  Fase E: vforge-live corre loop cero-defectos contra preview de Vercel
  Fase F: V reporta a Luis → Luis aprueba → deploy prod
```

---

## 4. Capa 2 detallada — el ensamblador

### 4.1 Intake — recepción y clasificación del input

El assembler acepta cualquier combinación de:

| Tipo de input | Cómo llega | Qué hace V |
|---|---|---|
| Idea en texto | Chat con V | Genera brief → manda a generador de UI |
| Logo / imagen | Upload en `/forge` | Extrae paleta → genera brand kit |
| ZIP de Stitch/v0 | Upload o URL | Extrae, clasifica, normaliza |
| Figma link | URL en chat | Exporta frames → convierte a componentes |
| Template propio | Selección en catálogo | Clona template, personaliza tokens |
| Repo existente | URL de GitHub | Clona, analiza estructura, identifica gaps |
| Brief de negocio | Documento / chat | V extrae entidades, roles, flujos |

V clasifica el input y decide el plan de generación. No hay un solo camino —
V elige la combinación de herramientas óptima para cada proyecto.

### 4.2 Scaffold — proyecto base

El scaffold es un proyecto Next.js App Router con todo el wiring listo:

```
app/
  (public)/              ← páginas públicas (landing, pricing, etc.)
    layout.tsx
    page.tsx
  (app)/                 ← dashboard autenticado
    layout.tsx           ← shell con sidebar + topbar + tenant resolver
    admin/               ← módulo admin inyectado (siempre presente)
    [módulos por rol]/   ← generados según schema de roles
  api/
    [tenantId]/          ← todas las APIs scoped a tenant
      [recurso]/
        route.ts
middleware.ts            ← Clerk auth + hostname → tenantId resolver
lib/
  auth/                  ← helpers de roles y permisos
  db/                    ← Prisma client + tenant filter wrapper
  tokens/                ← design tokens (compartidos con Tailwind)
prisma/
  schema.prisma          ← UN solo schema, UN solo dueño por turno
tailwind.config.ts       ← tokens vf-* + brand kit del proyecto
```

Reglas del scaffold:

- Clerk para auth, siempre. Multitenant via Organizations.
- Prisma + Neon para DB, siempre. `tenantId` en CADA modelo, sin excepción.
- Tailwind con tokens custom, siempre. Nunca estilos inline del generador.
- NO Lucide ni librerías de iconos. SVG inline únicamente.
- El scaffold se genera UNA vez al inicio. Los agentes posteriores AGREGAN a él,
  nunca regeneran la estructura base.

### 4.3 Generación de backend por roles

V recibe el schema de roles y genera a partir de un contrato como:

```typescript
// Ejemplo de schema de roles (input de V)
const roles = {
  admin: {
    can: ["*"],  // todo
    dashboard: true,
    manages: ["users", "vehicles", "rentals", "payments", "settings"]
  },
  agente: {
    can: ["vehicles:read", "rentals:*", "clients:read"],
    dashboard: true,
    manages: ["rentals", "vehicles"]
  },
  cliente: {
    can: ["vehicles:read", "rentals:own", "payments:own", "profile:own"],
    dashboard: false,
    views: ["catalog", "my-rentals", "my-payments", "profile"]
  }
};
```

A partir de esto V genera:

- Modelos Prisma con `tenantId` para cada entidad
- API routes con middleware que valida rol + scope
- Páginas/componentes condicionados por rol
- Sidebar/navegación filtrada por permisos del rol activo

### 4.4 Módulo Admin — componente versionado, no generado

El admin NO se genera por IA cada vez. Es un componente versionado que se inyecta:

- Gestión de usuarios y roles (CRUD + asignación)
- Dashboard con métricas del tenant
- Configuración del tenant (branding, dominio, integraciones)
- Auditoría (log de acciones)
- Gestión de integraciones (activar/desactivar conectores)

Vive en VForge como paquete. Se importa, no se copia. Cuando se actualiza el
módulo admin en VForge, TODOS los proyectos que lo usan reciben la actualización
automáticamente (porque es la misma instancia, no una copia).

El admin se ve desde dos puertas:

- `vforge.site/app/projects/{projectId}/admin` → vista owner (Luis ve todo)
- `dominio-del-cliente.com/admin` → vista tenant (cliente ve solo lo suyo)

Mismo código, mismo build, diferente hostname → diferente scope.

### 4.5 Build Gate — verificación real, no promesa de texto

Antes de que cualquier código ensamblado se considere "listo":

```bash
# Gate mínimo (obligatorio, corre el Agente Grok asignado):
npm run build              # si falla → REVISION, error exacto al reporte
npx tsc --noEmit           # typecheck sin emitir
npx eslint . --max-warnings 0  # lint limpio

# Gate visual (obligatorio, corre vforge-live):
vforge-live gate --url $PREVIEW_URL --scenario flujos.json --fail-on high

# Si todo pasa:
→ PR draft en GitHub con reporte adjunto
→ Preview deploy en Vercel con URL para revisión de Luis
→ NO merge automático — Luis aprueba
```

Si el build gate falla:

1. El error exacto se extrae del log
2. V genera un prompt de fix usando `forgePrompt()` de vforge-live
3. V reasigna la tarea al agente más apto para ese tipo de error
4. Se re-corre el gate. Máximo 5 iteraciones antes de escalar a Luis.

---

## 5. Flujo completo end-to-end

```
ENTRADA (cualquiera)
    │
    ▼
[V analiza input]
    │ Clasifica: texto / imagen / ZIP / Figma / repo / brief
    │ Extrae: entidades, roles, brand, flujos
    │
    ▼
[V planifica turno]
    │ Decide # de agentes (5-15)
    │ Asigna tipo por tarea (Claude Code / Grok / Codex)
    │ Mueve GPUs si necesita más inferencia
    │ Define fases (qué es paralelo, qué es serial)
    │
    ▼
[FASE A — Generación paralela]
    │ Frontend → generador externo (v0/Stitch/Claude Design/template)
    │ Scaffold → Claude Code genera estructura base
    │ Schema Prisma → Codex genera modelos desde roles
    │
    ▼
[FASE B — Ensamblaje]
    │ Backend routes → Codex genera CRUD + middleware
    │ Permisos → Claude Code genera role middleware
    │ Admin inject → Claude Code importa módulo admin versionado
    │ Frontend inject → Claude Code integra UI generada como componentes
    │
    ▼
[FASE C — Auditoría]
    │ Grok revisa todo el código generado
    │ Lint, security scan, tipos, imports rotos
    │ Si encuentra issues → V reasigna fix a agente disponible
    │
    ▼
[FASE D — Build Gate]
    │ npm run build + tsc + eslint
    │ Si falla → loop de fix (max 5 iteraciones)
    │ Si pasa → deploy preview a Vercel
    │
    ▼
[FASE E — Ojo (vforge-live)]
    │ Dispositivos virtuales abren la preview
    │ Ejecutan escenarios, graban video
    │ Clasifican defectos por severidad
    │ Loop cero-defectos hasta verde
    │ deployGate() decide: PROMOVER o BLOQUEAR
    │
    ▼
[FASE F — Entrega]
    │ V reporta a Luis: "App lista, X defectos resueltos, preview aquí"
    │ Luis revisa preview → aprueba
    │ Merge a main → deploy prod → dominio del cliente como espejo
    │ smokeTest() confirma que quedó vivo
    │
    ▼
APP EN PRODUCCIÓN — cero defectos verificados
Admin en vforge.site + espejo en dominio del cliente
```

---

## 6. API del Assembler — endpoint nuevo en VForge

### `POST /api/assembler/start`

```typescript
Body: {
  input: {
    type: "idea" | "logo" | "zip" | "figma" | "repo" | "brief" | "mixed",
    content: string | File,  // texto, URL, o archivo
    logo?: File,
    roles: { [roleName]: { can: string[], manages?: string[], views?: string[] } },
    name: string,
    description?: string,
    template?: string,       // del catálogo, si aplica
    integrations?: string[], // conectores a activar
  },
  config: {
    maxAgents: 5-15,         // V decide, pero Luis puede override
    agentMix: "auto" | { claudeCode: N, grok: N, codex: N },
    gpuPolicy: "auto" | "all" | "minimal",
    failOn: "blocker" | "high" | "medium",
    autoDeploy: false,       // NUNCA true sin orden de Luis
  }
}

Response: {
  jobId: string,
  status: "planning" | "assembling" | "testing" | "review" | "ready",
  previewUrl?: string,
  reportUrl?: string,
  phases: Phase[],
  agents: AgentAssignment[],
}
```

### Endpoints de seguimiento

```
GET  /api/assembler/status/{jobId}     → estado actual + progreso por fase
GET  /api/assembler/report/{jobId}     → reporte de vforge-live (HTML con video)
POST /api/assembler/approve/{jobId}    → Luis aprueba → merge + deploy prod
POST /api/assembler/cancel/{jobId}     → cancelar, descartar rama
POST /api/assembler/retry/{jobId}      → re-correr desde la fase que falló
```

---

## 7. Gestión de GPUs por V

V tiene acceso directo al mesh para mover recursos:

- `mesh_estado()` → qué GPUs están vivas
- `mesh_uso()` → consumo actual del día

### Políticas de V para GPUs

- **`auto`** (default): V evalúa la cola. Si hay más de 5 tareas pendientes de
  inferencia local, levanta GPU adicional. Si la cola baja a 0, la apaga en 10 min.
- **`all`**: todas las GPUs arriba desde el inicio del turno. Para proyectos complejos.
- **`minimal`**: solo Cerebras (cloud). Para proyectos simples o cuando el presupuesto
  de GPU del día ya se consumió.

V reporta el gasto de GPU al final de cada turno de ensamblaje:

```
"Turno completado: 8 agentes, 3 fases, 45 min.
 GPU: 1x RTX 5090 × 0.75 hrs = $0.10 USD
 Cerebras: 12,400 tokens = $0.008 USD
 Total turno: $0.108 USD"
```

---

## 8. Reglas no negociables

1. UN solo `schema.prisma` con UN dueño por turno. Nunca dos agentes tocan
   modelos Prisma al mismo tiempo. V serializa esta fase.
2. `tenantId` en CADA modelo, CADA query, CADA API. Sin excepción.
3. Build verde = requisito, no aspiración. Si `npm run build` falla, el job
   no avanza. No hay "se ve bien en dev". El build de producción es la verdad.
4. vforge-live es obligatorio antes de merge. No hay atajo. El ojo corre,
   graba, clasifica, y solo si `deployGate()` dice PROMOVER, se avanza.
5. No deploy a prod sin aprobación de Luis. V puede hacer todo hasta preview.
   El botón de "ship" lo aprieta Luis, no V, no un agente.
6. Rollback atómico. Si algo falla después del gate (post-deploy smoke falla),
   Vercel rollback al deployment anterior automáticamente.
7. Reasignación antes de escalar. Si un agente falla 2 veces, V reasigna a
   otro tipo de agente antes de pedirle ayuda a Luis. Solo después de 5 intentos
   totales V escala.
8. No Lucide, no librerías de iconos. SVG inline. No es negociable.
9. El módulo admin no se genera, se inyecta. Es un paquete versionado.
   Actualización centralizada, no copias divergentes por proyecto.
10. Evidencia siempre. Cada turno deja: log de agentes, reporte vforge-live
    con video, PR draft con diff, preview URL funcional. Si no hay evidencia,
    no existió.

---

## 9. Implementación — orden de construcción

### Fase 1: Scaffold generator (semana 1)
- Endpoint `/api/assembler/start` que recibe input y genera proyecto Next.js base
- Template base en repo separado (`vforge-scaffold-template`) con todo el wiring
- Test: genera un proyecto vacío con Clerk + Prisma + Tailwind que compila

### Fase 2: Role engine (semana 1-2)
- Parser de schema de roles → modelos Prisma + routes + middleware
- Test: genera backend para 3 roles con CRUD completo que compila y pasa lint

### Fase 3: Agent dispatcher (semana 2)
- V como coordinadora: recibe plan, despacha tareas a agentes
- Integración con Grok (Hetzner), Codex (OpenAI), Claude Code (Anthropic)
- Contratos atómicos: input → output → gate por tarea
- Test: V despacha 3 tareas a 3 agentes diferentes y recibe resultados

### Fase 4: Build gate integration (semana 2-3)
- Conectar vforge-live como paso obligatorio del pipeline
- Generación automática de escenarios desde schema de roles
- Test: proyecto ensamblado pasa por vforge-live y genera reporte

### Fase 5: Admin module (semana 3)
- Extraer admin module como paquete versionado importable
- Multi-hostname: mismo código, diferente tenant por hostname
- Test: admin funciona en vforge.site Y en dominio custom

### Fase 6: GPU orchestration (semana 3-4)
- V controla encendido/apagado de GPUs del mesh
- Auto-scale basado en cola de tareas
- Reportes de consumo por turno

### Fase 7: End-to-end (semana 4)
- Flujo completo: idea → agentes → build → ojo → preview → approve → prod
- Demo: Luis dice "quiero app de renta de autos" → sale app completa

---

## 10. Métricas de éxito

| Métrica | Objetivo |
|---|---|
| Tiempo idea → preview | < 30 minutos |
| Tiempo idea → producción | < 2 horas (con aprobación) |
| Defectos post-deploy | 0 (verificado por ojo) |
| Build failures por turno | < 2 (resueltos por agentes) |
| Costo promedio por app | < $0.50 USD en compute |
| Agentes por turno promedio | 6-8 |
| Reuse del admin module | 100% (nunca se regenera) |

---

Este documento es la especificación ejecutable del VForge Assembler.
Cualquier agente que reciba una tarea de este sistema debe leer este
documento primero. V es la autoridad. Luis es el owner. El ojo no miente.

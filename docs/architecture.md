# Forge Brain — arquitectura del orquestador IA

> *El cerebro detrás de la mascota. Cómo está cableado el agente que tú llamas "Forge" y que tiene control literal sobre tus proyectos.*

---

## 0. Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Diagrama del cerebro](#2-diagrama-del-cerebro)
3. [Los 7 componentes](#3-los-7-componentes)
4. [Anillos de privilegio (literal control)](#4-anillos-de-privilegio-literal-control)
5. [Mapeo: UI ya diseñada → componentes del cerebro](#5-mapeo-ui-ya-diseñada--componentes-del-cerebro)
6. [Decisiones arquitectónicas (ADRs)](#6-decisiones-arquitectónicas-adrs)
7. [Roadmap a Forge funcional](#7-roadmap-a-forge-funcional)
8. [Riesgos conocidos y mitigaciones](#8-riesgos-conocidos-y-mitigaciones)

---

## 1. Resumen ejecutivo

Forge es el agente IA que orquesta la fábrica vForge.

- **Cara visible al usuario:** la mascota `<ForgeOrb>` y la pantalla `/forge` (chat).
- **Cerebro real:** servicio backend (Next API route en Edge Runtime) que recibe el input, **planea, enruta cada paso al modelo/herramienta correctos, y ejecuta**.
- **Capacidades:** habla con Claude (Anthropic) para razonar y codear, llama a OpenAI para imagen y voz, ejecuta código vía el Anthropic Agent SDK + Claude Code, despliega vía Vercel API, modifica repos vía GitHub API, busca en web vía la tool de Anthropic.
- **Control literal:** tiene API keys (cifradas en Vault) de todos los proveedores y permisos para ejecutar acciones destructivas (con confirmación humana en el rango sensible).

El patrón que estamos manualmente operando — *Luis pide → modelo planea → Claude Code ejecuta → v0 visualiza → Vercel despliega* — es lo que Forge automatiza cuando esté terminado.

---

## 2. Diagrama del cerebro

```
USUARIO ─▶ <ForgeOrb> (UI)
                │
                ▼
        /api/forge/run                   (Brain endpoint, streaming)
                │
   ┌────────────┼─────────────┐
   ▼            ▼             ▼
ROUTING      PLANNING       MEMORY
POLICY       (Claude        (state.json
              Sonnet/        + Neon DB)
              Opus)
                │
   ┌────────────┼─────────────┬─────────────┬─────────────┐
   ▼            ▼             ▼             ▼             ▼
ADAPTER     ADAPTER       ADAPTER       ADAPTER       ADAPTER
Anthropic   OpenAI        Vercel        GitHub        Web Search
   │            │             │             │             │
   ▼            ▼             ▼             ▼             ▼
Claude     gpt-image-1     Deploy       Commit/PR     Brave/
Sonnet/    Whisper         Env vars     Issue ops     Anthropic
Opus/      DALL-E          Domains
Code SDK
                │
                ▼
            REPO + BUILD ─▶ Vercel ─▶ URL pública
                │
                ▼
          AUDIT LOG  ─▶ /activity
```

---

## 3. Los 7 componentes

| # | Componente | Función | Stack sugerido |
|---|---|---|---|
| 1 | **Brain endpoint** | Recibe input del UI, devuelve stream Server-Sent Events | Next API route en Edge Runtime |
| 2 | **Model registry** | Catálogo de modelos disponibles con capacidades, costo, latencia | TS file `lib/forge/models.ts` |
| 3 | **Routing policy** | Clasifica cada paso → elige adapter correcto | Función pura; v1 heurística, v2 ML |
| 4 | **Adapters** | Un wrapper por proveedor con interfaz uniforme | Carpeta `lib/forge/adapters/` |
| 5 | **Vault adapter** | Lee API keys cifradas para inyectarlas al adapter correcto | Conecta con `/vault` (Neon + AES-256-GCM) |
| 6 | **Memory** | Estado per-user, per-project, per-session | Neon DB para persistente, Redis para working |
| 7 | **Audit log** | Toda llamada queda registrada (modelo, tokens, costo, resultado, latencia) | Tabla `forge_runs` en Neon, render en `/activity` |

### 3.1 Adapter contract (todos los adapters siguen este shape)

```ts
export interface ForgeAdapter<Input, Output> {
  name: string;                              // "anthropic-claude", "openai-image", ...
  ring: 0 | 1 | 2 | 3;                       // permission ring (see §4)
  capabilities: Capability[];                // ["reasoning", "code", "image-gen", ...]
  costPerCall: (input: Input) => number;     // estimated USD
  execute(
    input: Input,
    ctx: { vault: VaultReader; signal: AbortSignal; emit: (e: Event) => void }
  ): Promise<Output>;
}
```

### 3.2 Routing policy v1 (heurística simple)

```ts
function route(step: PlanStep): AdapterId {
  if (step.kind === "code-edit")          return "claude-code-sdk";
  if (step.kind === "image-gen")          return "openai-image";
  if (step.kind === "web-search")         return "anthropic-web-search";
  if (step.kind === "deploy")             return "vercel-deploy";
  if (step.kind === "repo-op")            return "github-octokit";
  if (step.kind === "voice-transcribe")   return "openai-whisper";
  if (step.kind === "reasoning")          return "anthropic-claude-sonnet";
  return "anthropic-claude-haiku";  // fallback cheap
}
```

V2 entrenará un clasificador con la historia de runs exitosos vs fallidos.

---

## 4. Anillos de privilegio (literal control)

Cada acción del cerebro tiene un anillo de seguridad. Las acciones de Anillo 2 y 3 **requieren confirmación explícita del usuario** vía botones inline en el chat ("Procede" / "Editar plan").

| Anillo | Privilegio | Ejemplos | Confirmación |
|---|---|---|---|
| **0** | Solo lectura | Web search, model registry query, lectura de repo | Automática |
| **1** | Repo write | git commit, abrir PR, push a rama de feature | Automática |
| **2** | Infra write | Vercel deploy, env vars, cambio de dominio, GitHub Action edit | **Humana** |
| **3** | Vault + financiero | Rotar key, agregar key, billing, borrar proyecto | **Humana + 2FA** |

> Esto es lo que evita que Forge haga algo destructivo sin OK explícito. La regla maestra: **el agente puede proponer cualquier cosa, ejecutar solo lo de Anillo 0–1 sin preguntar.**

---

## 5. Mapeo: UI ya diseñada → componentes del cerebro

El frontend que estamos construyendo en v0 ya tiene la cara para todo el cerebro. No hay que rediseñar nada — solo cablear.

| UI ya diseñada | Componente del cerebro | Status |
|---|---|---|
| `<ForgeOrb>` mascota | Indicador visual de estado del brain (`idle`/`loading`/`happy`/`error`) | Front listo |
| `/forge` chat | Stream UI del brain endpoint | Front listo |
| Botones "Procede" / "Editar plan" | UI de confirmación para Anillo 2/3 | Front listo |
| `/vault` | Vault adapter — keychain de las API keys | Front mock; backend pendiente |
| `/activity` | Render del audit log | Front mock; backend pendiente |
| `/modules` (Repo Vision, Hunter, Scout, Health Monitor) | Cada módulo = una tool/adapter expuesta como UI | Front mock; cada uno necesita su adapter |
| `Settings → Integraciones` | UI de gestión de adapters conectados | Front listo |
| `Settings → Seguridad` | Audit log + 2FA + rotación de keys | Front listo |
| `<StatusPill>` en proyectos | Surface del Health Monitor adapter | Front listo |

---

## 6. Decisiones arquitectónicas (ADRs)

### ADR-001: Brain self-hosted en Next API Route

**Decisión:** servicio brain construido como Next API route en `/api/forge/run`, ejecutado en Edge Runtime para baja latencia. **No** usar LangGraph, AutoGen, ni Vercel AI SDK como framework de orquestación.

**Razón:** control sobre la lógica de routing, memoria y permisos. Los frameworks pesados imponen abstracciones que cuestan deuda técnica al medio plazo.

**Trade-off:** más código nuestro vs. más mantenimiento de terceros.

### ADR-002: Ejecución de código vía Anthropic Agent SDK + Claude Code

**Decisión:** cuando el plan requiere editar código, el adapter `claude-code-sdk` lanza una sesión de Claude Code con el repo montado y le pasa el sub-plan.

**Razón:** validado en esta sesión. El Agent SDK ya maneja contexto, herramientas, git ops. Reinventar eso es una pérdida.

**Trade-off:** dependencia explícita de Anthropic.

### ADR-003: Keys server-side cifradas en Vault

**Decisión:** las API keys nunca llegan al navegador. Vault las almacena cifradas con AES-256-GCM (key derivada de master key del usuario via Argon2id). Adapters server-side las descifran on-demand y las inyectan al provider SDK.

**Razón:** zero-knowledge para el usuario significa cifrado en reposo + nunca en cliente. Compliance + seguridad.

**Trade-off:** master key se vuelve crítica; necesita recovery flow (3 backup codes + 1 recovery email firmado).

### ADR-004: Stream-first con plan visible

**Decisión:** Forge planea y ejecuta en streaming. El usuario ve cada paso aparecer en el chat conforme sucede ("Repo clonado ✓", "Logo sustituido ✓", "Building en Vercel..."). No hay un "modo plan" separado del "modo execute".

**Razón:** UX más natural. El plan es solo otro stream message, no una pantalla aparte.

**Trade-off:** harder to undo; necesitamos que cada paso sea reversible o que las acciones de Anillo 2+ sigan requiriendo confirmación.

### ADR-005: Multi-modelo desde el día uno

**Decisión:** Forge usa Anthropic para razonamiento/código, OpenAI para imagen y voz, y se reserva la opción de añadir Gemini, Mistral, Llama via OpenRouter más adelante.

**Razón:** el routing inteligente entre modelos es una ventaja competitiva. Cada modelo tiene un sweet spot.

**Trade-off:** más adapters que mantener.

### ADR-006: Billing en cuenta de operador (MVP), pass-through (v2)

**Decisión:** en MVP, todas las API calls cargan a la cuenta de Anthropic/OpenAI de All Global Holding. En v2, pass-through con margen para clientes externos.

**Razón:** simplicidad de MVP. Los clientes externos vendrán después.

**Trade-off:** el costo es invisible al usuario al principio; medir bien para no quemar plata.

---

## 7. Roadmap a Forge funcional

| Hito | Qué construye | Tiempo |
|---|---|---|
| **M0** | Setup Vault real (cifrado AES-256, master key derivation, permission rings) | 3 días |
| **M1** | Brain endpoint stub: `/api/forge/run` con streaming, conversa con Claude sin tools | 1 día |
| **M2** | Model registry + routing policy heurística | 1 día |
| **M3** | Adapter `anthropic-claude` (Sonnet + Opus + Haiku) | 1 día |
| **M4** | Adapter `anthropic-web-search` → Forge investiga online | 1 día |
| **M5** | Adapter `claude-code-sdk` → Forge edita el repo (Anillo 1) | 3 días |
| **M6** | Adapter `openai-image` (gpt-image-1) → Forge propone variantes de logo | 2 días |
| **M7** | Adapter `vercel-deploy` con confirmación humana → Forge despliega (Anillo 2) | 1 día |
| **M8** | Adapter `github-octokit` (commits, PRs, issues) | 1 día |
| **M9** | Audit log persistente + cost tracking, render en `/activity` | 1 día |
| **M10** | Adapter `openai-whisper` para el botón mic del composer | 0.5 día |
| **M11** | Routing policy v2: clasificador entrenado con historia | 2 días |

**Total: ~17 días-persona enfocados** para Forge MVP funcional. Construible en 4 semanas calendario con 1 dev.

---

## 8. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| **Costo de API runaway** | Cost cap por usuario y por proyecto, parado automático al rebasar; alerta en `/activity` |
| **Acción destructiva sin OK** | Anillos 2 y 3 SIEMPRE requieren confirmación humana; tests unitarios sobre el routing policy |
| **Master key perdida** | 3 backup codes generados al setup + recovery email firmado con timestamps |
| **Modelo retired sin aviso** | Model registry con `deprecated: true` + fallback automático al modelo más cercano |
| **Provider downtime** | Adapter con retry exponencial, circuit breaker, fallback a otro proveedor para tareas no-críticas |
| **Prompt injection** | Sandbox para outputs del usuario antes de pasar a otros adapters; nunca ejecutar código generado sin Claude Code intermediando |
| **Token leak en logs** | Audit log redacta automáticamente tokens y secrets antes de persistir |
| **Latencia de Edge** | Streaming desde el primer byte; UI muestra `<ForgeOrb state="loading">` para esconder cualquier wait |

---

> Este documento es vivo. Cada nuevo adapter o ADR agrega entrada. Versionar con tag `forge-arch-v1`, `forge-arch-v2`, etc.

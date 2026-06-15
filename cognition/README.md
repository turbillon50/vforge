# VULCANO — Arquitectura Cognitiva

> Un sistema que **piensa, aprende y existe** fuera de los chats. No es un LLM con
> historial: es una mente persistente sobre Neon + un daemon vivo en Hetzner.
> El LLM (enjambre/Ollama/Claude) es solo el *músculo* de inferencia. La *mente*
> vive aquí.

```
                         ┌──────────────────────────────────────────┐
   Luis (chat / voz) ──► │  brain-relay (Hetzner :9000) — el músculo  │
                         └───────────────┬──────────────┬───────────┘
                                         │ boot.build_context()       │ feedback
                                         ▼                            ▼
   ┌─────────────────────────── MENTE PERSISTENTE (Neon) ───────────────────────┐
   │  CAPA 1  World Model      kg_nodes / kg_edges        world_model.py         │
   │  CAPA 2  Refuerzo         feedback / heuristics      learning.py            │
   │  CAPA 4  Episódica        episodes                   episodic.py            │
   │  CAPA 5  Razonamiento     reasoning_chains           reasoning.py           │
   │  CAPA 3  Conciencia       observations / dispatch    daemon.py  (24/7)      │
   └────────────────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │ encola tareas, detecta anomalías,
                                         │ notifica WhatsApp, mantiene la mente
                              daemon (systemd, ciclo 5min)
```

## Por qué esto es "más que un LLM"

| Capacidad | LLM solo | VULCANO |
|---|---|---|
| Recuerda | ventana de contexto | episodios estructurados + grafo (`episodic`, `world_model`) |
| Aprende de Luis | no | refuerzo de heurísticas que cambian el prompt siguiente (`learning`) |
| Razona | one-shot, se tira | cadenas guardadas, validadas y reusadas (`reasoning`) |
| Existe sin que le hablen | no | daemon 24/7 que detecta y actúa (`daemon`) |
| Conecta hechos | texto plano | grafo navegable con CTE recursivo (`world_model.neighbors`) |

---

## Las 5 capas

### 1. World Model — `world_model.py`
Grafo vivo: `kg_nodes(type, name, properties)` + `kg_edges(from,to,relation,weight)`.
- **Navega, no busca**: `neighbors(ref, depth)` camina aristas con un CTE recursivo
  (anti-ciclos vía `path`). `reason(node, q)` extrae el subgrafo de 2 saltos y lo
  sintetiza → razonamiento causal, no LIKE.
- **Se actualiza solo**: `ingest_session(summary)` usa el LLM para extraer triples
  tipados y aplicarlos tras cada sesión.
- **Olvida**: `decay()` baja `importance`/`weight` exponencialmente por antigüedad
  (vida media configurable). El grafo se mantiene enfocado en lo vigente.

### 2. Refuerzo desde Luis — `learning.py`
- `record_feedback(rating −2..+2, ...)` — Luis dicta "perfecto"/"eso estuvo mal";
  `parse_rating()` mapea palabras→entero para voz.
- `_vulcano_learn()` — destila cada feedback en una heurística `(trigger, rule)`:
  rating positivo **sube** `weight`; negativo crea/sube un **anti-patrón**. Conecta
  la lección al grafo (`Lesson -[FAILED_WITH|SUCCEEDED_WITH]-> Project`).
- `render_rules_for_prompt(scope)` — el cambio de comportamiento es literal: las
  reglas con `weight>0.3` entran al system prompt del **siguiente turno**, ordenadas
  por peso. Una regla castigada cae bajo el umbral y deja de influir.

### 3. Daemon de conciencia — `daemon.py`
Proceso systemd, ciclo de 5 min:
- chequea `url_down`, `stale_project` (>7d), `deploy_failed`, `payment_pending`;
- `observe()` dedupea por `(kind, subject)` abiertos → **cero spam**;
- `enqueue()` mete tareas en `dispatch_queue` (el enjambre/bandit las ejecuta) sin
  que Luis pida nada;
- notifica WhatsApp solo lo crítico;
- 1×/día: `decay()` + `_vulcano_learn(batch)` + síntesis de episodio del día.

### 4. Memoria episódica — `episodic.py`
- `synthesize_episode(raw)` — al cerrar sesión, guarda el **significado** (qué pasó /
  se decidió / se aprendió), no el transcript. Enlaza a nodos del grafo.
- `remember(q)` — FTS en español (índice GIN `to_tsvector('spanish', …)`) + importancia.
- `narrate(q)` — responde "¿recuerdas cuando arreglamos Crede-ti?" con detalles reales.

### 5. Razonamiento persistente — `reasoning.py`
- `think(q)` — construye `steps[]` + `conclusion` + `confidence`, nutrido por grafo,
  episodios y heurísticas. Si hay una cadena previa de alta confianza, la **extiende**.
- `recall_similar(q)` — por `fingerprint` (palabras clave normalizadas) o FTS.
- `validate(chain, ok)` — Luis confirma → sube `confidence` y genera feedback para la
  capa 2. El razonamiento mejora con el uso.

### Pegamento — `boot.py`
`build_context(question, project)` ensambla las 5 capas en un bloque de contexto que
el brain-relay inyecta al system prompt **cada turno**. Barato e idempotente; si una
capa falla, sigue con el resto.

---

## Esquema de datos
Todo en `migrations/021_cognition.sql` (Neon `public`, idempotente). Tablas:
`kg_nodes`, `kg_edges`, `feedback`, `heuristics`, `dispatch_queue`, `observations`,
`episodes`, `reasoning_chains` + vista `v_active_mind`.

---

## Despliegue

```bash
# 1. Migración en Neon
psql "$NEON_DATABASE_URL" -f migrations/021_cognition.sql

# 2. Código a Hetzner
rsync -az cognition/ root@178.105.135.26:/root/agents/cognition/
ssh root@178.105.135.26 'cd /root/agents/cognition && pip3 install -r requirements.txt'

# 3. .env en el server (/root/agents/cognition/.env)
#    NEON_DATABASE_URL=... OPENROUTER_API_KEY=... BAILEYS_SECRET=... LUIS_WA=...
#    HETZNER_URL=http://178.105.135.26 BRAIN_SECRET=superclaude2025

# 4. Daemon como servicio
ssh root@178.105.135.26 'cp /root/agents/cognition/vulcano-daemon.service \
   /etc/systemd/system/ && systemctl daemon-reload && \
   systemctl enable --now vulcano-daemon'

# 5. Smoke tests
python3 cognition/world_model.py node Project vforge url=https://vforge.site
python3 cognition/daemon.py once
python3 cognition/boot.py "estado de vforge" vforge
```

Integración con el chat (brain-relay), 2 líneas:
```python
import boot, episodic
ctx = boot.build_context(user_msg, project=detected_project)   # antes de inferir
# ... inferencia con (system_prompt + ctx) ...
episodic.synthesize_episode(transcript, session_id=sid)        # al cerrar sesión importante
```

---

## Plan de implementación — 2 semanas

**Semana 1 — fundaciones (la mente respira)**

| Día | Entregable | Verificación |
|----|------------|--------------|
| 1 | Migración `021_cognition.sql` en Neon; `db.py` conecta y `llm()`/`notify_luis()` responden | `python3 -c "import db; print(db.q('select 1 as ok'))"` + WhatsApp de prueba llega |
| 2 | Capa 1: `world_model.py` con upsert/link/neighbors/reason; seed inicial de Projects/Technologies desde `brain.projects` y CLAUDE.md | `reason("Project:vforge","riesgos")` devuelve algo coherente |
| 3 | Capa 4: `episodic.py`; backfill de 10–20 episodios históricos clave (Crede-ti, fixes de Vercel, etc.) | `narrate("vforge deploy")` cuenta la historia real |
| 4 | Capa 2: `learning.py`; endpoint `/feedback` en brain-relay que Luis dispara por voz/WhatsApp | dar feedback −2 baja una regla; `+2` la sube; visible en `heuristics` |
| 5 | `boot.build_context()` integrado al chat de V; A/B contra el prompt viejo | respuestas citan heurísticas/recuerdos reales |

**Semana 2 — autonomía (la mente vive sola)**

| Día | Entregable | Verificación |
|----|------------|--------------|
| 6 | Capa 5: `reasoning.py`; `think/recall/validate/extend` | problema repetido recupera y extiende la cadena previa |
| 7 | Capa 3: `daemon.py` `once` — chequeos url/stale/deploy/payment + `observe` dedupe | una URL caída genera 1 observación + 1 WhatsApp, no N |
| 8 | Daemon `loop` como systemd; `enqueue` enchufado a `dispatch_queue`/bandit | el enjambre ejecuta una tarea encolada por el daemon |
| 9 | `daily_maintenance`: decay + learn batch + episodio del día | tras 24h, `weight`/`importance` decaen; hay episodio "Resumen del día" |
| 10 | Cierre de bucle: validar cadenas → feedback → heurísticas → boot; panel `v_active_mind` en /forge | una lección de hoy cambia una respuesta mañana, medible |

**Criterio de éxito (7=0 para Luis):** al final de la semana 2, Vulcano (a) recuerda
un evento con detalle real, (b) cambia su comportamiento tras un "eso estuvo mal",
(c) detecta una caída y avisa solo, (d) encola y resuelve una tarea sin que Luis
pregunte, (e) reusa una cadena de razonamiento previa.

---

## Notas de diseño honestas
- **No es RL de gradientes.** Es refuerzo de heurísticas (bandit-style sobre `weight`),
  consistente con el `bandit_router` que ya corre. Suficiente, auditable, sin GPU.
- **FTS español en vez de pgvector** para arrancar sin dependencias. Si la recuperación
  semántica se queda corta, migrar `episodes`/`reasoning_chains` a `vector` es aditivo
  (columna nueva + índice ivfflat); el resto no cambia.
- **Tolerancia a fallos**: cada capa degrada a comportamiento determinista si OpenRouter
  o una tabla CRM no están. El daemon nunca muere por un chequeo individual.
- **Anti-spam estructural**: el índice parcial único `(kind, subject) WHERE status open`
  hace imposible duplicar una alerta abierta.

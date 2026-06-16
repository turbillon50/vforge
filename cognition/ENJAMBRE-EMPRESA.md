# Enjambre 3.0 — Capa Empresa

> De "agentes que aprenden" (2.0) a **organización viva** (3.0).
> Cómo el enjambre escala de proyectos de Luis a operar un hospital o una empresa completa.

---

## 0. La idea en una frase

El Enjambre 2.0 ya resolvió **cómo** se hace una tarea: qué modelo (claude/grok/codex/shell/browser) la ejecuta, con especialización dinámica, competencia y memoria. El 3.0 agrega un eje **ortogonal** — **quién** es dueño del problema: las **esferas de dominio**, actores persistentes que viven 24/7, se comunican entre sí y deciden por monto.

```
                    EJE WHO  (Enjambre 3.0 — NUEVO)
                    qué dominio · quién decide
        Médica   Legal   Financiera   Operaciones   RRHH   V-CEO
          │        │          │            │          │       │
          ▼        ▼          ▼            ▼          ▼       ▼
   ┌─────────────────────────────────────────────────────────────┐
   │              dispatch_queue  (jobs tagueados .esfera)         │
   └─────────────────────────────────────────────────────────────┘
          │        │          │            │          │       │
          ▼        ▼          ▼            ▼          ▼       ▼
        claude   grok      codex        shell     browser  ...
                    EJE HOW  (Enjambre 2.0 — YA EXISTE)
                    qué modelo ejecuta · route_pick_agent(task_type)
```

**La esfera es el cerebro de dominio; el agente son las manos.** Una esfera nunca llama un modelo distinto: cuando necesita trabajo, encola un job tagueado con su `esfera` y `router2` sigue eligiendo el mejor agente. Esto reusa **todo** lo del 2.0 sin tocarlo.

---

## 1. Especialización profunda — sin fine-tuning

No entrenamos modelos médicos. La especialización de una esfera son **tres capas**, todas sobre infraestructura que ya tenemos:

| Capa | Qué es | Dónde vive |
|------|--------|-----------|
| **Identidad** | `system_prompt` con la experticia del dominio (NOM, COFEPRIS, CFDI/SAT, LFT/IMSS, fideicomisos) | `esferas.system_prompt` |
| **Memoria de dominio** | corpus RAG: reglas, regulaciones, protocolos, casos pasados — recordado por similitud antes de razonar | `esfera_memory` + `esfera_recall()` |
| **Aprendizaje de ejecución** | qué modelo gana en *este* dominio (Legal-CODE vs Médica-RESEARCH) — heredado del 2.0 | `agent_strengths` (2.0) |

> `esfera_memory` es **distinta** de `swarm_memory` (2.0): aquella aprende "qué modelo gana en qué task_type"; esta guarda **conocimiento de dominio** (la NOM, la regla del CFDI 4.0, el protocolo del cliente). `'commons'` es el namespace compartido por todas las esferas.

Las 6 esferas fundadoras (sembradas en la migración): **V-CEO, Financiera, Legal, RRHH, Operaciones, Médica**. Añadir una vertical nueva = un `INSERT` en `esferas` + cargar su corpus en `esfera_memory`. Cero código.

---

## 2. Persistencia continua — el organismo no duerme

El daemon (`cognition/daemon.py`) ya corre 24/7 en Hetzner (systemd, ciclo de 5 min). El 3.0 engancha ahí, no inventa proceso nuevo:

```python
# daemon.cycle() — cada ciclo, después de los chequeos:
enjambre2.tick()            # 2.0: organiza jobs
esfera.tick_all()           # 3.0: cada esfera monitorea su dominio + drena su inbox del bus
esfera.arbitrate_tactical() # V-CEO arbitra decisiones tácticas
```

Cada esfera, en su tick:
1. **Monitorea** su dominio (`watch_spec`: vistas Neon, CRM, n8n) → publica hechos.
2. **Drena** su inbox del bus (eventos a los que está suscrita).
3. **Reacciona**: razona con su `system_prompt` + memoria recordada → emite jobs, publica hechos nuevos, o abre decisiones.

> **Escalamiento de cadencia:** empezamos con un solo daemon que tickea todas las esferas (barato, ya existe). Cuando una esfera necesite latencia fina (Financiera vigilando pagos en vivo), se le da su propio `systemd` que llame `esfera.tick_one()` con su `cadence_sec`. Mismo código, otro proceso.

---

## 3. Comunicación en tiempo real — el blackboard

`dispatch_queue` es **PULL** (el enjambre jala tareas). La comunicación esfera↔esfera es **PUSH**: el patrón **blackboard** (Hearsay-II). Nadie le habla a nadie directo — todos escriben y leen del pizarrón compartido (`esfera_events`).

```
 Financiera detecta salida grande
        │  publish('finance.large_outflow', money=250000)
        ▼
 ┌──────────────── esfera_events (el pizarrón) ───────────────┐
 │  id  topic                  source      money    status     │
 │  88  finance.large_outflow  financiera  250000   open       │
 └────────────────────────────────────────────────────────────┘
        │ suscritas a 'finance.*'         │ suscrita a 'finance.large_outflow'
        ▼                                  ▼
      Legal valida contrato            V-CEO vigila liquidez
        │ publish('legal.compliance_flag')
        ▼
      ...la cadena sigue sola
```

**Dos modos de entrega, uno respalda al otro** (`cognition/bus.py`):

- **DURABLE** — tabla `esfera_events`. Fuente de verdad, auditable, permite replay. Va por el pooler de Neon como todo lo demás. **Siempre funciona.**
- **WAKE** — `pg_notify('esfera_bus', id)` para despertar al instante. ⚠️ **Restricción real:** LISTEN/NOTIFY **no sobrevive el pooler de Neon** (pgbouncer en modo transacción lo corta). Por eso el listener abre una **conexión directa** (DSN sin `-pooler`). Si no se puede, cae a **poll cada 3 s** sobre la tabla — más lento pero nunca se pierde un evento.

Mecánica del bus:
- `esfera_publish(topic, source, payload, severity, money)` → INSERT + notify.
- `esfera_inbox(esfera)` → eventos `open` que matchean sus `esfera_subscriptions` (patrón `finance.*`) y que aún no consumió. No te despiertas con tu propio eco.
- `esfera_ack(event_id, esfera)` → marca tu reacción; cuando **todas** las suscritas reaccionaron, el evento pasa a `consumed`.

---

## 4. Jerarquía de decisión — el dinero manda

Toda acción con plata o riesgo pasa por `open_decision()`, que aplica `decide_authority()`:

| Nivel | Umbral | Quién decide | Estado inicial |
|-------|--------|--------------|----------------|
| **autonomous** | < $10k MXN, reversible, dentro del techo de la esfera | la esfera sola | `approved` |
| **tactical** | $10k – $100k MXN | **V-CEO** (la esfera de gobierno) | `pending` → publica `decision.pending` |
| **strategic** | > $100k MXN **o** irreversible | **Luis** (o el cliente) | `escalated` → WhatsApp vía `notify_luis()` |

- Cada esfera tiene su propio techo (`authority_mxn`); si es menor a $10k, su techo manda.
- **V-CEO** es una esfera más, pero especial: suscrita a `decision.pending` y `conflict.*`. Arbitra con criterio de "salud del negocio a 90 días" y resuelve conflictos entre esferas (Financiera quiere recortar, RRHH se opone).
- Todo queda en el ledger `decisions` — el rastro auditable que una empresa necesita (y que conecta con cumplimiento).

`notify_luis()` ya existe en `db.py` (puente Baileys, puerto 3001) — el escalamiento estratégico **ya tiene canal**.

---

## 5. El salto cognitivo — de dónde emerge

La inteligencia que ninguna esfera tiene por sí sola **emerge del blackboard + las suscripciones**. Ejemplo real, sin que nadie lo programe paso a paso:

```
1. Financiera detecta una salida de $250k a un proveedor nuevo.
       → publish('finance.large_outflow', money=250000)
2. Legal (suscrita a finance.*) despierta, recuerda "fideicomiso/contrato",
   ve que no hay contrato firmado con ese proveedor.
       → publish('legal.compliance_flag', payload={falta_contrato})
       → open_decision(legal, 'contrato', ...)  → como toca $250k = STRATEGIC
3. Operaciones (suscrita a ops/proveedor) recalcula si el cambio de proveedor
   valía la pena dado el riesgo legal.
4. V-CEO ve la salida grande + el flag legal → no la arbitra (es estratégica).
5. El daemon escala a Luis: "🏛️ salida $250k a proveedor sin contrato — Legal marcó riesgo."
```

Ninguna esfera "sabía" toda la cadena. Financiera solo vio plata; Legal solo vio un contrato faltante; V-CEO solo vio el monto. La conexión —*"este pago es riesgoso porque el proveedor es nuevo y no hay contrato"*— **emergió** de tres dominios reaccionando al mismo pizarrón. Eso es lo que un humano podría no conectar a tiempo.

El sustrato de la emergencia es concreto y medible:
- **Suscripciones cruzadas** → un hecho de un dominio activa otros (no silos).
- **Memoria de dominio** → cada esfera aporta contexto que las demás no tienen.
- **Decisiones encadenadas** → una decisión publica un evento que dispara la siguiente.
- **V-CEO como integrador** → ve el patrón global que ninguna esfera local ve.

---

## 6. Lo que YA está aterrizado (en este commit)

| Artefacto | Qué es | Estado |
|-----------|--------|--------|
| `migrations/enjambre-3.0-empresa.sql` | esferas, esfera_memory, esfera_events, subscriptions, decisions + 6 funciones + seed de 6 esferas | escrito, **falta correr** |
| `cognition/bus.py` | blackboard: publish/inbox/ack + listener LISTEN/NOTIFY con fallback a poll | escrito, compila |
| `cognition/esfera.py` | runtime: tick_all/tick_one, react (LLM+RAG), open_decision, V-CEO arbitraje, escalamiento | escrito, compila |
| `cognition/daemon.py` | hook de `enjambre2.tick()` + `esfera.tick_all()` en el ciclo (imports guardados) | parcheado, compila |

## 7. Lo que FALTA para producción (honesto)

1. **Correr la migración** contra el Brain (Neon `ep-super-glitter`):
   `psql "$NEON_DATABASE_URL" -f migrations/enjambre-3.0-empresa.sql`
2. **Verificar la cadena emergente** end-to-end:
   `python3 cognition/bus.py` (publica un finance.large_outflow) →
   `python3 cognition/esfera.py tick` (Legal debe reaccionar) →
   revisar `SELECT * FROM decisions` y `SELECT * FROM v_organismo`.
3. **Cablear los `monitor()` reales** de cada esfera a sus fuentes (CRM, vistas de flujo de caja, nómina, n8n). Hoy solo Financiera tiene un ejemplo cableable.
4. **Cargar el corpus de dominio** real en `esfera_memory` (NOMs, reglas CFDI, contratos tipo) — la calidad de la esfera = la calidad de su memoria.
5. **Proceso listener dedicado** si queremos wake instantáneo (hoy el daemon hace poll cada ciclo de 5 min; para latencia fina, un systemd que corra `bus.listen()`).
6. **Deploy del daemon** actualizado en Hetzner (el daemon corre de una copia en el server, no del repo).

---

## 8. Resumen del diseño

- **Ortogonalidad**: esferas (WHO) × agentes (HOW). El 3.0 no reescribe el 2.0; lo monta encima.
- **Persistencia**: el daemon 24/7 que ya existe tickea las esferas; cadencia fina = systemd por esfera.
- **Comunicación real**: blackboard durable (`esfera_events`) + wake por NOTIFY con fallback a poll — diseñado alrededor de la restricción real del pooler de Neon.
- **Gobierno**: jerarquía por monto en SQL puro (`decide_authority`), ledger auditable, V-CEO arbitra lo táctico, Luis lo estratégico por WhatsApp.
- **Emergencia**: suscripciones cruzadas + memoria de dominio + decisiones encadenadas → conexiones que ningún dominio individual hace.

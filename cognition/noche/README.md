# Protocolo de Noche de Vulcano

Lo que pasa **automáticamente de 2am a 7am** mientras Luis duerme. La fábrica
no para: analiza la sesión, consolida memoria, sueña correlaciones, construye
tareas nocturnas, prepara el día y reporta por WhatsApp a las 7.

> Filosofía: **cero teatro**. Cada fase opera sobre datos reales del Brain
> (Neon) y usa `claude` CLI como motor de razonamiento. Si no hay señal o el
> LLM no responde, la fase lo dice claro y **no fabrica** reportes falsos.

## Timeline

| Hora  | Fase | Script | Qué hace | Salida |
|-------|------|--------|----------|--------|
| 02:00 | Análisis de sesión | `s1_session.py` | Lee la sesión nocturna (vulcano_memory, dispatch_queue, conversations, vulcano_events) y destila: construido / resuelto / pendiente + **3 lecciones** que sella en `lessons`. | `state/session.json` |
| 02:30 | Consolidación de memoria | `s2_memory.py` | Vectoriza lo nuevo (`brain_index.py`, Jina v3), **refuerza** pesos de lo usado en 24h, **decae** lo viejo (>14d), **archiva** lo irrelevante. | `state/memory.json` |
| 03:00 | Sueño cognitivo | `s3_dream.py` | Mira **a lo ancho** (30d, todos los proyectos): correlaciones no obvias, problemas recurrentes entre clientes, oportunidades sistémicas. Siembra hallazgos como `patterns` (source=`sueno`). | `state/dream.json` |
| 03:00 | *(existente)* learning night | `learning/run.py night` | digest + decay + contrast (ya estaba; convive). | — |
| 04:00 | Construcción autónoma | `s4_build.py` | Ejecuta tareas marcadas **nocturnas** en `dispatch_queue` con `claude` CLI. Topes: 5 tareas / 90 min. | `state/build.json` |
| 06:30 | Preparación del día | `s5_prep.py` | Junta s1+s3+s4 + estado en vivo (bloqueos, jobs fallidos, mensajes) → redacta el briefing: **3 prioridades**, mientras dormías, ojo con, predicción. | `briefing_latest.md` |
| 07:00 | Reporte a Luis | `v_morning.py` *(parcheado)* | Manda el WhatsApp con `briefing_latest.md` si está fresco (<3h); si no, su lógica original. | WhatsApp + `vulcano_memory` |

## Cómo encolar una tarea nocturna

Cualquier agente puede dejar trabajo para la madrugada:

```sql
INSERT INTO dispatch_queue (prompt, agent, status, source, metadata, priority)
VALUES ('[noche] Investiga X y entrega un doc', 'claude', 'queued', 'night',
        '{"night":true}'::jsonb, 5);
```

Se considera nocturna si: `metadata->>'night'='true'` **o** `source='night'`
**o** el texto contiene `[noche]`.

## Instalación / actualización

```bash
bash /root/agents/noche/install.sh   # idempotente: re-corre cuando quieras
```

Instala el bloque de cron (entre marcadores `BEGIN/END Protocolo de Noche`) y
parchea `v_morning.py` (deja `v_morning.py.bak-noche`).

## Probar a mano (sin esperar a la madrugada)

```bash
cd /root/agents/noche
HOME=/root python3 s1_session.py
HOME=/root python3 s2_memory.py
HOME=/root python3 s3_dream.py
HOME=/root python3 s4_build.py
HOME=/root python3 s5_prep.py
cat briefing_latest.md
```

## Infra que usa (real, verificada)

- **DB**: Neon pooler `ep-super-glitter` (mismo que `v_morning.py`).
- **Motor**: `claude` CLI con auth de suscripción (sin `ANTHROPIC_API_KEY`).
- **WhatsApp**: Baileys `localhost:3001/send` → número de Luis.
- **Embeddings**: `/root/agents/brain_index.py` (Jina v3, 1024-dim).

## Logs

Todo va a `/root/agents/noche/noche.log`. Cada corrida deja además un rastro en
`vulcano_memory` (agent `noche-sN`) y los estados JSON en `state/`.

Fuente versionada en el repo: `cognition/noche/`.

# Barrido de Higiene — dispatch_queue — 2026-08-27

**Agente:** shell (job #1145) · **Conexión:** NEON_DATABASE_URL_API (ep-super-glitter, `/root/.env`) · **Regla:** cero inventos, solo datos reales.

## 1. Jobs stale (running > 3h) → marcados failed
**RESULTADO: 0 jobs marcados.**
Solo hay 2 jobs `running`, ambos de segundos de antigüedad:
- #1144 `claude` — "AUDITORIA ROTATIVA…" (0.03 h)
- #1145 `shell` — "BARRIDO DE HIGIENE…" (este mismo job, 0.01 h)

Ninguno supera 3h → `UPDATE ... error='stale: sin progreso'` devolvió 0 filas. No se inventó ningún stale.
El coordinador sigue matando huérfanos solo (visto en histórico `orphan-killed-by-coordinator`), así que la acumulación de stale ya no ocurre.

## 2. Conteo done/failed últimas 24h por agente
| agente | done | failed |
|--------|------|--------|
| claude | 1 | 0 |
| grok   | 2 | 0 |
| shell  | 2 | 0 |

**Fallos en 24h / 7d / 30d: 0 / 0 / 0.** La cola está sana; sin fallos en el último mes.

## 3. Patrones históricos de fallo (26 fallos totales, todos ≥ jun 2026)
Fallos por agente: claude 10 · shell 4 · claude_code 4 · all 3 · claude-code 3 · mesh 1 · codex 1
Top errores normalizados:
- `stale` + `stale-auto` → **9** — jobs colgados sin progreso (ya resuelto por auto-kill del coordinador).
- `unknown task_type: claude_code|code|mesh` → **8** — el router no reconoce esos task_type.
- `Lenguaje natural - requeria claude no shell` / `bad shell cmd` → **3** — prompts NL ruteados a `shell` en vez de `claude`.
- timeouts (fantasma/manual/2s) → **3** — jobs cortados por límite de tiempo.

## Lecciones aprendidas
1. **[routing] task_type sin normalizar** — `claude_code`, `code`, `mesh` disparan `unknown task_type` (8 fallos, 2º patrón más grande).
   *Fix:* mapa de alias en el router antes de despachar (claude_code/code→claude, mesh→su handler). Normalizar también el nombre del agente (`claude-code` vs `claude_code` conviven y ensucian el conteo).
2. **[routing] NL ruteado a shell** — prompts en lenguaje natural caen en el agente `shell` y revientan (3 fallos: "requeria claude no shell", "bad shell cmd").
   *Fix:* detectar lenguaje natural (sin binario/verbo shell al inicio) y forzar target=claude antes de ejecutar.
3. **[liveness] stale bajo control** — 9 fallos históricos por stale, pero 0 en 30 días gracias al orphan-kill del coordinador.
   *Fix:* mantener el watchdog; el barrido manual sobra salvo auditoría. Cola verde confirmada esta corrida.

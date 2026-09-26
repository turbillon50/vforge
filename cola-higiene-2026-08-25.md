# Barrido de Higiene — dispatch_queue — 2026-08-25

**Agente:** shell (job #1134) · **Conexión:** NEON_DATABASE_URL_API · **Regla:** cero inventos, solo datos reales.

## 1. Jobs stale (running > 3h) → marcados failed
**RESULTADO: 0 jobs marcados.**
Solo hay 2 jobs `running` y ambos son de segundos de antigüedad:
- #1133 `claude` — "AUDITORIA ROTATIVA…" (0.02 h)
- #1134 `shell` — "BARRIDO DE HIGIENE…" (este mismo job, 0.01 h)

Ninguno supera 3h → no se marcó nada. No se inventó ningún stale.
Nota sana: el último stale real fue **2026-06-18**. Desde entonces el coordinador
mata los huérfanos automáticamente (visto en #624 `orphan-killed-by-coordinator`),
por lo que la acumulación de stale ya no ocurre.

## 2. Conteo done/failed últimas 24h por agente
| agente | done | failed |
|--------|------|--------|
| claude | 8 | 0 |
| grok   | 7 | 0 |
| shell  | 2 | 0 |
**Fallos en 24h / 7d / 30d: 0.** La cola está sana en la ventana reciente.

## 3. Patrones históricos de fallo (27 fallos totales, todos ≥ jun 2026)
Fallos por agente: claude 10 · shell 5 · claude_code 4 · claude-code 3 · all 3 · mesh 1 · codex 1
Top errores normalizados:
- `stale` / `stale-auto` → **9** (claude/all) — jobs colgados sin progreso (resuelto por auto-kill).
- `unknown task_type: claude_code|code|mesh` → **8** — el router no reconoce esos task_type.
- `Lenguaje natural - requeria claude no shell` / `bad shell cmd` / `exit 127 Responde: not found` → **4** — prompts en lenguaje natural ruteados a `shell` en vez de `claude`.

## Lecciones aprendidas
1. **[routing] task_type sin normalizar** — `claude_code`, `code`, `mesh` disparan `unknown task_type` (8 fallos).
   *Fix:* mapa de alias en el router (claude_code/code→claude, mesh→su handler) antes de despachar.
2. **[routing] NL ruteado a shell** — prompts en lenguaje natural caen en el agente `shell` y revientan (4 fallos: "requeria claude no shell", exit 127).
   *Fix:* detectar lenguaje natural (sin binario/verbo shell al inicio) y forzar target=claude.
3. **[liveness] stale ya bajo control** — 9 fallos históricos por stale, pero 0 desde 2026-06-18 gracias al orphan-kill del coordinador.
   *Fix:* mantener el watchdog; no hace falta barrido manual salvo auditoría.

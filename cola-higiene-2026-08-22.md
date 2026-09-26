# Barrido de Higiene — dispatch_queue (2026-08-22)

## 1. Barrido de stale (running > 3h → failed)
- Jobs `running` al momento: **1** (id 1102, agent=shell, 0.0h — activo, NO stale).
- UPDATE ejecutado (`status='failed', error='stale: sin progreso'` para running con started_at > 3h): **0 filas afectadas**.
- Veredicto: cola limpia, ningún job colgado hoy.

## 2. Actividad últimas 24h (por agente)
| agente | done | failed | cancelled |
|--------|------|--------|-----------|
| grok   | 4    | 0      | 0         |
| shell  | 3    | 0      | 0         |
| claude | 1    | 0      | 0         |

Total 24h: 8 done, 0 failed, 1 running. Ventana sana, sin fallos.

## 3. Patrones de fallo (histórico completo — 27 failed/error)
| patrón | n |
|--------|---|
| stale / orphan / reaped | 11 |
| unknown task_type (alias no reconocido) | 8 |
| NL ruteado a shell | 4 |
| timeout | 2 |
| git worktree collision | 1 |

### Lecciones aprendidas

**L1 — Aliases de task_type/agent no normalizados (8 fallos).**
Errores `unknown task_type: claude_code | claude-code | code | mesh`. El dispatcher solo reconoce nombres canónicos; los encolados con variantes revientan.
*Fix:* normalizar en el enqueue — mapear `claude_code`, `claude-code`, `code` → `claude`; registrar handler `mesh` o rechazar con mensaje claro. Tabla de aliases única, no strings sueltos.

**L2 — Lenguaje natural ruteado a `shell` (4 fallos).**
`Lenguaje natural - requeria claude no shell`, `shell exit 127: Responde: not found`, `bad shell cmd`. Prompts en prosa cayeron al agente shell que intentó ejecutarlos como comando.
*Fix:* el router debe detectar prosa (no empieza con binario válido / tiene espacios+verbos) y mandar a `claude`, no a `shell`. Default seguro = claude.

**L3 — Stale/orphan recurrente (11 fallos, el patrón #1 histórico).**
`stale`, `stale-auto`, `orphan-killed-by-coordinator`, `timeout fantasma`. Jobs que arrancan y no reportan progreso; el coordinador los reap.
*Fix:* mantener este barrido (running > 3h → failed) como cron. Además exigir heartbeat/progress_pct; sin heartbeat en N min → reap temprano en vez de dejarlo colgado horas.

## Conexión
NEON_DATABASE_URL_API (neondb / ep-super-glitter). Datos 100% reales de la tabla, cero inventos.

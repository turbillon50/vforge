# Barrido de higiene — dispatch_queue

**Fecha:** 2026-08-28
**Ejecutor:** Vulcano (shell job id 1151)
**Conexión:** Brain Neon (dispatch_queue vive en el mismo Neon del Brain)

## 1. Barrido de stale (running > 3h → failed)
- Jobs en `running`: **1** (id 1151 = ESTE barrido, 0.1h de vida).
- Candidatos stale (`running` con `started_at` > 3h): **0**.
- **Acción: ninguna.** No se marcó nada — no había jobs colgados reales. Cero inventos.

## 2. Actividad últimas 24h por agente
| agente | done | failed | running |
|--------|------|--------|---------|
| claude | 1 | 0 | 0 |
| grok   | 2 | 0 | 0 |
| shell  | 1 | 0 | 1 (este barrido) |

- **Fallos en 24h: 0.** Ventana limpia, sin patrón de fallo en el periodo.

## 3. Patrones de fallo recurrentes (corpus histórico: 27 failed/error)
Como 24h no tiene fallos, los patrones salen del histórico completo de la tabla:

| Patrón | # | Causa raíz | Fix |
|--------|---|-----------|-----|
| `unknown task_type` (claude_code, code, mesh) | 8 | Se encolan jobs con task_type que el dispatcher no reconoce | Normalizar/aliasar task_type al encolar: `claude_code`/`code`/`claude-code`→`claude`; whitelist estricta + rechazo temprano con mensaje claro |
| stale / stale-auto / orphan-killed / timeout | ~13 | Job tomado (`picked_up`/`started`) pero el worker muere o nunca reporta → queda colgado hasta que el coordinador lo mata | Heartbeat por worker + auto-requeue; este barrido periódico es el parche |
| NL → shell | 4 | Prompt en lenguaje natural ("Hola estás ahí", "Responde solo:...") ruteado al worker `shell`, que intenta ejecutarlo como comando (exit 127 / bad shell cmd) | Clasificar NL vs comando en el router; default a `claude`, nunca a `shell` |
| codex worktree add | 1 | `git worktree add` retornó ≠0 (retries=2) | Usar `cp -al` para node_modules / limpiar worktree previo (drift conocido) |

## Lecciones registradas (tabla `lessons`, importance 6)
1. **task_type sin normalizar rompe el encolado** — 8 fallos por `unknown task_type`. Fix: aliasar antes de encolar.
2. **Lenguaje natural ruteado a shell siempre falla** — 4 fallos. Fix: router clasifica NL→claude.
3. **Jobs stale sin heartbeat** — mayor volumen de fallos. Fix: heartbeat + auto-requeue + barrido periódico.

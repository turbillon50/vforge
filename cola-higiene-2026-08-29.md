# Barrido de higiene — dispatch_queue

**Fecha:** 2026-08-29
**Ejecutor:** Vulcano (vía /brain/exec en Hetzner)
**Conexión:** `NEON_DATABASE_URL_API` (`/root/.env`) — mismo Neon del Brain (ep-super-glitter-aqj6d5g0)

## 1. Barrido de stale (running > 3h → failed)
- Jobs en `running`: **2** (id 1156 claude ~94s, id 1157 shell ~30s de vida).
- Candidatos stale (`running` con `started_at` > 3h): **0**.
- **Acción: ninguna.** `UPDATE ... SET status='failed', error='stale: sin progreso'` ejecutó y retornó `[]`. Nada colgado real. Cero inventos.

## 2. Actividad últimas 24h por agente
| agente | done | running | failed |
|--------|------|---------|--------|
| claude | 0 | 1 | 0 |
| grok   | 3 | 0 | 0 |
| shell  | 1 | 1 | 0 |

- **Fallos en 24h: 0.** Ventana limpia, sin patrón de fallo en el periodo.

## 3. Patrones de fallo recurrentes (corpus histórico: 27 failed/error)
Como 24h no tiene fallos, los patrones salen del histórico completo de `error`:

| Familia | # | Causa raíz | Fix |
|---------|---|-----------|-----|
| stale / stale-auto / orphan-killed | 10 | Worker toma el job y muere o nunca reporta → queda colgado hasta que el coordinador lo mata | Heartbeat por worker + auto-requeue; este barrido periódico es el parche |
| `unknown task_type` (claude_code=4, code=3, mesh=1) | 8 | Se encolan jobs con task_type que el dispatcher no reconoce | Aliasar/normalizar al encolar: `claude_code`/`code`/`mesh`→`claude`; whitelist estricta + rechazo temprano |
| NL → shell (lenguaje natural=2, exit 127 "Responde: not found"=1, bad shell cmd=1) | 4 | Prompt en lenguaje natural ruteado al worker `shell`, que lo corre como comando | Clasificar NL vs comando en el router; default a `claude`, nunca a `shell` |
| timeout (manual/fantasma/2s) | 3 | Timeouts, algunos fantasma | Revisar límites por task_type; no matar por debajo del tiempo real de arranque |
| git worktree add ≠0 | 1 | `git worktree add -b gajo-x-...` retornó ≠0 | `cp -al` para node_modules / limpiar worktree previo (drift conocido) |

## Lecciones registradas (importance 6)
1. **task_type sin normalizar rompe el encolado** — 8 fallos por `unknown task_type`. Fix: aliasar antes de encolar.
2. **Lenguaje natural ruteado a shell siempre falla** — 4 fallos. Fix: router clasifica NL→claude, jamás default a shell.
3. **Jobs stale sin heartbeat** — mayor volumen (10). Fix: heartbeat + auto-requeue + barrido periódico.

---

## Pase vespertino (18:01 UTC) — 2º barrido del día

**Ejecutor:** Vulcano (shell job id 1160, vía /brain/query en Hetzner)

### 1. Stale (running > 3h → failed)
- Jobs en `running`: **1** (id 1160 = ESTE barrido, 0.01h de vida).
- Candidatos stale (`started_at` > 3h): **0**. **Acción: ninguna.** Nada colgado. Cero inventos.

### 2. Actividad últimas 24h por agente
| agente | done | running | failed |
|--------|------|---------|--------|
| claude | 1 | 0 | 0 |
| grok   | 3 | 0 | 0 |
| shell  | 2 | 1 (este) | 0 |

- **Fallos en 24h: 0.** Ventana sigue limpia entre el pase matutino y el vespertino.

### 3. Corpus histórico de fallos (snapshot 18:01)
Totales por status: `done`=1113, `failed`=26, `cancelled`=12, `error`=1, `running`=1.
Sin drift respecto al pase matutino: mismas 3 familias dominan (stale ~10, `unknown task_type` 8, NL→shell 4). No se registran lecciones nuevas — las 3 del pase matutino siguen vigentes sin cambios.

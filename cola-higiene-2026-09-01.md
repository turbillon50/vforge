# Barrido de higiene — dispatch_queue — 2026-09-01

Conexión: NEON_DATABASE_URL_API (neondb, ep-super-glitter). Datos 100% reales de la tabla. Cero inventos.

## 1) Stale running >3h → marcados failed
**0 jobs marcados.** El único `running` está fresco y sano:
- id 1197 (`shell`, ~41 s) — este mismo barrido de higiene.

Ninguno pasa el umbral de 3h. Tampoco hay `running` sin `started_at`. No se ejecutó ningún UPDATE (no había nada que marcar).

## 2) Estado global de la cola (snapshot)
| status | count |
|---|---|
| done | 1147 |
| failed | 29 |
| cancelled | 12 |
| running | 1 |
| error | 1 |

Éxito global ≈ 96% (1147 done / 1189 terminados). Fallos sin cambio vs 08-31 (siguen 29 failed + 1 error) → **no hubo fallos nuevos en el día**.

## 3) Últimas 24h por agente (por completed_at/started_at/created_at)
| agente | done | failed |
|---|---|---|
| grok | 3 | 0 |
| shell | 2 | 0 |
| claude | 1 | 0 |

24h totales: **6 done, 0 failed, 0 error.** Ventana limpia. Codex **no corrió** en 24h (0 jobs) → su bug de worktree sigue sin ejercitar, no confirmado como arreglado.

## Patrones de fallo (histórico acumulado — siguen SIN corregir)
Los 30 fallos totales se agrupan en 3 patrones ya identificados el 08-31 y aún vigentes:

### PATRÓN 1 — stale / orphan / timeout (12 de 30 ≈ 40%, la mayor causa)
`stale` x7, `stale-auto` x2, `orphan-killed-by-coordinator` x1, `timeout` (manual/2s/fantasma) x3. Jobs que se cuelgan sin progreso y el coordinador acaba matándolos.
**Estado hoy:** 0 stale (por eso el barrido >3h no marcó nada). El barrido automático está conteniendo bien este patrón. **Mantener el cron de barrido.**

### PATRÓN 2 — router: `unknown task_type` (8 de 30 ≈ 27%)
`unknown task_type: claude_code` x4, `unknown task_type: code` x3, `unknown task_type: mesh` x1. El dispatcher recibe task_types que no mapea y bota el job. Además `Lenguaje natural - requeria claude no shell` x2 (misrouting shell↔claude) y `bad shell cmd` x1.
**Fix pendiente:** aliasar en el router (`claude_code`→`claude`, `code`→`codex`, `mesh`→handler real) + enum/validación al encolar.

### PATRÓN 3 — codex: `git worktree add` exit 128 (3 de 30)
`git -C /root worktree add -b gajo-x-<ts>` falla porque `/root` no es repo git; los repos reales viven en `/root/work/<repo>`, `/root/vforge`. Última ocurrencia 2026-08-30. Como codex no corrió en 24h, **no se puede confirmar que esté arreglado.**
**Fix pendiente:** crear el worktree desde el clon real del repo del job, no desde `/root`.

## Lecciones (1–3)
1. **Barrido de stale funcionando:** el mayor patrón histórico (40% de fallos = stale/orphan/timeout) hoy está en 0. El cron >3h contiene el sangrado; mantenerlo vivo.
2. **`unknown task_type` sigue drenando jobs** (`claude_code`/`code`/`mesh`) — pendiente desde 08-31 sin corregir. Alias en router + enum al encolar es el fix de mayor ROI ahora que stale está controlado.
3. **Bug de worktree de codex sin verificar:** codex 0 jobs en 24h, su falla determinista (`git -C /root worktree add` exit 128) no se ejercitó. Antes de declarar codex sano, correrle un job de prueba y confirmar que usa el repo real.

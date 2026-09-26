# Barrido de Higiene — dispatch_queue — 2026-08-21

**Ejecutor:** Vulcano · **Conexión:** NEON_DATABASE_URL_API · **Regla:** cero inventos, solo datos reales de la tabla.

## 1. Barrido de jobs `running` colgados (>3h → failed)
- Jobs en `running`: **2** (id 1094, 1095, agente `shell`) — ambos con `started_at` de hace **~30 s**.
- Stale con `started_at` > 3h: **0**.
- **Acción: NINGUNA marca aplicada.** No había jobs colgados. No se inventó trabajo.

## 2. Actividad últimas 24h por agente
| agente | done | failed | otros | total |
|--------|------|--------|-------|-------|
| shell  | 2 | 0 | 2 (running recientes) | 4 |
| grok   | 3 | 0 | 0 | 3 |
| claude | 1 | 0 | 0 | 1 |

- **Fallos en 24h: 0.** La cola está sana en la ventana reciente.
- Estado global tabla: done 1047 · failed 26 · cancelled 12 · running 2 · error 1.

## 3. Patrones de fallo (corpus histórico, 27 failed/error)
> La ventana 24h no tuvo fallos, así que los patrones salen del histórico completo.
> **Corrección de análisis:** el bucket que parecía "TypeScript/tipos" era un falso positivo — la palabra "type" matcheaba `unknown task_type`. Reclasificado.

| # | patrón | causa real |
|---|--------|-----------|
| 8 | `unknown task_type: X` | task_type no registrado en el daemon (`mesh`, `claude_code`). Ruteo/config, NO código de app. |
| 9 | stale / stale-auto / orphan-killed | jobs colgados barridos por el sweeper |
| 4 | timeout | `timeout tras 2s` (umbral demasiado corto) + `timeout fantasma` |
| 3 | misroute a `shell` | lenguaje natural encolado al agente shell → `Lenguaje natural - requeria claude no shell` / `bad shell cmd` |
| 1 | git worktree mal formado | `git -c /root worktree ...` |

## Lecciones aprendidas
1. **`unknown task_type` es el fallo #1 histórico (8).** Tareas dispatchadas con un task_type que el daemon no maneja (`mesh`, `claude_code`). **Fix:** validar/normalizar `task_type` ANTES de encolar (ej. `claude_code`→`claude`) o registrar los handlers faltantes en `vulcano_daemon.py`.
2. **Misrouting: lenguaje natural cae en el agente `shell` y muere.** **Fix:** clasificador previo que mande texto NL a `claude`, nunca a `shell`; el shell solo recibe comandos ejecutables.
3. **Timeouts demasiado cortos matan jobs legítimos** (`timeout tras 2s`). **Fix:** subir el umbral base por task_type y separar timeout real de "fantasma" (job que sí terminó pero no reportó).

## Estado que dejo
Cola sana. Sweeper de stale funcionando (0 colgados hoy). Sin acciones destructivas aplicadas.

# Barrido de higiene — dispatch_queue — 2026-08-31

Conexión: NEON_DATABASE_URL_API (neondb, ep-super-glitter). Datos 100% reales de la tabla.

## 1) Stale running >3h → marcados failed
**0 jobs marcados.** No hay jobs atascados. Único `running`: id 1188 (agent `shell`, 6.1 min) — sano, dentro de ventana. No se inventó ningún UPDATE.

## 2) Estado global de la cola (snapshot)
| status | count |
|---|---|
| done | 1139 |
| failed | 29 |
| cancelled | 12 |
| error | 1 |
| running | 1 |

Éxito global ≈ 96%.

## 3) Últimas 24h por agente
| agente | done | failed | running |
|---|---|---|---|
| grok | 17 | 0 | 0 |
| claude | 2 | 0 | 0 |
| shell | 1 | 0 | 1 |
| codex | 0 | **3** | 0 |

24h totales: 20 done, **3 failed**, 1 running. **Codex falló 100% (3/3).**

## Patrones de fallo detectados

### PATRÓN 1 (crítico, nuevo) — codex: `git worktree add` exit 128
Los 3 fallos de codex en 24h (ids 1166, 1167, 1171 — proyectos ruta618 y lutor) son idénticos:
```
Command '['git','-C','/root','worktree','add','-b','gajo-x-<ts>','/tmp/worktree-gajo-x-<ts>']' returned non-zero exit status 128.
```
**Causa raíz VERIFICADA:** `/root` **no es un repositorio git**. `git -C /root worktree list` → `fatal: not a git repository (or any of the parent directories): .git`. El worker de codex hardcodea `git -C /root worktree add`, pero los repos reales viven en `/root/work/<repo>`, `/root/vforge`, etc. Falla determinista, 100% de codex, agota los 2 retries y muere.
**Fix:** el worker debe crear el worktree **desde el clon real del REPOSITORIO del job** (cd al repo del proyecto), no desde `/root`. Si el repo no está clonado aún, clonarlo primero. Alternativa: `git init`/apuntar a un repo base válido. Sin esto, codex nunca produce.

### PATRÓN 2 (recurrente, histórico) — router: `unknown task_type`
Histórico: `unknown task_type: claude_code` x4, `unknown task_type: code` x3, `unknown task_type: mesh` x1. El dispatcher recibe task_types que no mapea y bota el job.
**Fix:** normalizar/aliasar task_type en el router (`claude_code`→`claude`, `code`→`codex`, `mesh`→handler real) + enum/validación al encolar para que ni entren mal.

### PATRÓN 3 (recurrente) — misrouting lenguaje natural → shell
`Lenguaje natural - requeria claude no shell` x2, `shell exit 127: /bin/sh: Responde: not found`. Prompts en español se rutean a `shell` y explotan como comando.
**Fix:** detección de prompt NL (no empieza con binario/verbo shell) → forzar ruteo a `claude`, nunca a `shell`.

## Lecciones (1–3)
1. **codex está caído por diseño:** `git -C /root worktree add` asume que `/root` es repo y no lo es → exit 128 en el 100% de sus jobs. Apuntar el worktree al clon real del proyecto.
2. **task_type sin normalizar** sigue drenando jobs (`claude_code`/`code`/`mesh`). Alias en router + enum al encolar.
3. **NL ruteado a shell** convierte tareas de lenguaje en `command not found`. Gate de ruteo: NL → claude, jamás shell.

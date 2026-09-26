#!/usr/bin/env python3
import json, urllib.request
FECHA="2026-08-04"; BASE="http://127.0.0.1:9000"; SECRET="superclaude2025"
def post(path, body):
    req=urllib.request.Request(BASE+path, data=json.dumps(body).encode(),
        headers={"Content-Type":"application/json"})
    return urllib.request.urlopen(req, timeout=40).read().decode()

report="""# Barrido de Higiene dispatch_queue — 2026-08-04 (corte 18:04 UTC)

## 1. Jobs colgados (running > 3h) -> 0 marcados
Query en vivo: 2 jobs en `running`, ambos jóvenes. Ninguno supera 3h por `started_at`.
| id | agente | edad |
|---:|--------|------|
| 978 | shell | ~3.5 min |
| 980 | grok  | ~0.5 min |

**UPDATE ejecutado (running & started_at < now()-3h -> failed 'stale: sin progreso'): 0 filas.**
No hay stale que barrer. El cierre de `running` sigue sano.

## 2. Conteo done/failed últimas 24h (por agente)
| agente | done | failed | cancelled |
|--------|-----:|-------:|----------:|
| grok   | 3 | 0 | 0 |
| shell  | 2 | 0 | 0 |
| claude | 1 | 0 | 0 |
| **TOTAL** | **6** | **0** | **0** |

Tasa de éxito 24h: **100% (6/6 cerrados, 0 fallos).** Volumen bajo, cola sana.

## 3. Patrones de fallo (histórico completo — 27 registros: 26 failed + 1 error)
Las 24h salieron limpias, así que el análisis de patrones usa el histórico completo:
| patrón | n | % | detalle |
|--------|--:|--:|---------|
| stale / orphan / timeout | 13 | 48% | jobs `running` sin progreso + orphan-killed + timeouts |
| task_type desconocido | 8 | 30% | 'claude_code', 'code'/'CODE' — el ejecutor no reconoce el task_type |
| shell / misrouting | 4 | 15% | NL ruteado a shell, exit 127 "not found", bad shell cmd |
| git worktree | 1 | 4% | codex, exit non-zero al crear worktree |
| sin texto de error | 1 | 4% | registro sin texto de error |

## 4. Señal de tendencia
- Global: **933 done / 26 failed / 12 cancelled / 1 running / 1 error** -> éxito **~96%**.
- Histórico de fallos **CONGELADO en 27 registros** (26 failed + 1 error, sin cambio desde el barrido del 07-27).
- Último fallo real: **id 725 (2026-07-02)** -> **~33 días sin un solo fallo nuevo**.
- Sin stale acumulado; ventanas de 24h consecutivas 100% limpias corrida tras corrida.
- Lectura: el cierre de jobs `running` funciona (no se acumula stale entre corridas) y TODOS los fallos
  conocidos son PRE-fix. El trabajo ya es preventivo, no correctivo.

## Lecciones aprendidas
1. **stale/orphan/timeout es el fallo #1 histórico (48%, 13/27) pero 0 en ~33 días.** Los jobs que quedan
   `running` sin progreso ya se cierran solos. FIX de blindaje: NO depender del barrido manual -> CRON que
   auto-falle `running` con `started_at` > 3h + watchdog por progreso que mate lo que no avanza sin esperar
   las 3h. Automatizar ESTE barrido como cron cierra la deuda de raíz.
2. **task_type desconocido es la única deuda técnica que puede volver a morder (30%, 8/27).** Valores
   'claude_code', 'code'/'CODE' truenan con "unknown task_type: X". FIX: mapear alias en el router ANTES de
   enrutar (claude_code->claude, code->claude|codex) y validar contra un enum al encolar; lo desconocido cae a
   claude por defecto, nunca a fallo. No reaparece en ~33 días -> confirmar si el fix ya se aplicó o si el bajo
   volumen lo esconde.
3. **La cola está SANA -> prioridad = mantenimiento, no rescate.** Con fallos congelados y 24h limpio corrida
   tras corrida, el foco es: (a) cerrar/confirmar el fix de task_type, (b) automatizar este barrido como cron
   con auto-fail, y (c) dedupe al encolar (en corridas previas se vieron jobs de higiene duplicados).

_Fuente: tabla dispatch_queue (NEON_DATABASE_URL_API = misma Neon del Brain, ep-super-glitter). Barrido por Vulcano 2026-08-04 vía /brain/query en vivo. Cero inventos: todos los números salen de la tabla._
"""

mem=("Barrido higiene dispatch_queue 2026-08-04 (corte 18:04 UTC): 0 jobs stale marcados (UPDATE running & "
     "started_at<now()-3h afecto 0 filas; 2 running jovenes: id 978 shell ~3.5min, 980 grok ~0.5min). Ultimas 24h: "
     "6 done / 0 failed (100%: grok 3, shell 2, claude 1). HALLAZGO: historico de fallos CONGELADO en 27 registros "
     "(26 failed + 1 error) sin cambio desde el barrido del 07-27; ultimo fallo real id 725 del 2026-07-02 -> ~33 "
     "dias SIN fallo nuevo. Cola sana ~96% exito global (933 done / 26 failed / 12 cancelled / 1 error / 1 running). "
     "Patrones historicos: stale/orphan/timeout 48% (13), task_type desconocido claude_code/code 30% (8), "
     "shell/misrouting 15% (4), worktree 4% (1), sin texto 4% (1). Trabajo ya preventivo: cron auto-fail running>3h "
     "+ watchdog, cerrar fix task_type (alias en router + enum al encolar), dedupe al encolar. No depender del "
     "barrido manual.")

print("SAVE:", post("/brain/save", {"secret":SECRET, "file":f"projects/cola-higiene-{FECHA}.md", "content":report}))
print("MEMORY:", post("/brain/memory", {"secret":SECRET, "action":"store", "agent":"vulcano",
    "type":"pattern", "topic":"dispatch_queue higiene barrido", "content":mem, "importance":6,
    "metadata":{"fecha":FECHA, "stale_marcados":0, "done_24h":6, "failed_24h":0, "running_24h":2,
                "historico_fallos_congelado":27, "dias_sin_fallo_nuevo":33, "exito_global_pct":96}}))

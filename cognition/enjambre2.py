#!/usr/bin/env python3
"""enjambre2 — Orquestador del Enjambre 2.0.

Un solo `tick()` que el loop del dispatcher llama cada ciclo, ANTES de ejecutar
jobs. Hace que el enjambre aprenda y se organice solo:

  1. RUTEO       jobs nuevos sin agente -> al mejor histórico (route)
  2. COMPETENCIA jobs críticos -> 2 contendientes + juez
  3. DIVISIÓN    jobs grandes -> sub-esferas + síntesis
  4. SÍNTESIS    sub-esferas terminadas -> consolida en el padre
  5. ARBITRAJE   competencias listas -> el juez decide y promueve al ganador

Y `finish_job()` para que el ejecutor selle el resultado (score + memoria).

Hook en el loop existente (cognition/daemon.py -> cycle, o el dispatcher):
    import enjambre2
    enjambre2.tick()
"""
import router2
import esfera_split
import esfera_compete
from db import q, run

try:
    from db import log               # reutiliza el logger del daemon si existe
except Exception:                    # noqa: BLE001
    import logging
    log = logging.getLogger("enjambre2")


def tick() -> dict:
    """Un ciclo de organización del enjambre. Devuelve resumen de lo que hizo."""
    res = {"ruteados": 0, "competencias": 0, "divididos": 0,
           "sintetizados": 0, "arbitrados": 0}

    # 1+2+3 — barre los jobs PENDIENTES y sin tocar (status pending, role solo, sin agente fijado por humano)
    nuevos = q("""
        SELECT id, prompt, task_type, agent, priority, depth, role, metadata AS meta, source
        FROM dispatch_queue
        WHERE status='pending' AND role='solo'
          AND (source IS NULL OR source <> 'esfera_split')  -- los hijos ya vienen ruteados
          AND (routed_reason IS NULL)                       -- aún no pasó por el router 2.0
        ORDER BY priority ASC, id ASC
        LIMIT 25
    """)

    for job in nuevos:
        try:
            # ¿crítico? -> competencia (no se ejecuta solo)
            if esfera_compete.is_critical(job):
                esfera_compete.start_competition(job)
                res["competencias"] += 1
                continue
            # ¿demasiado grande? -> se divide
            if esfera_split.split_job(job):
                res["divididos"] += 1
                continue
            # normal -> rutea al mejor agente + inyecta memoria
            router2.route(job)
            res["ruteados"] += 1
        except Exception as e:  # noqa: BLE001
            log.warning("enjambre2: job %s falló en organización: %s", job["id"], e)

    # 4 — consolida síntesis cuyas sub-esferas ya terminaron
    try:
        res["sintetizados"] = len(esfera_split.synthesize_ready())
    except Exception as e:  # noqa: BLE001
        log.warning("enjambre2: síntesis falló: %s", e)

    # 5 — arbitra competencias con ambos contendientes listos
    try:
        res["arbitrados"] = len(esfera_compete.judge_ready())
    except Exception as e:  # noqa: BLE001
        log.warning("enjambre2: arbitraje falló: %s", e)

    log.info("enjambre2 tick: %s", res)
    return res


def finish_job(job_id: int, success: bool, quality: float,
               what_worked: str | None = None, what_failed: str | None = None):
    """El ejecutor llama esto al cerrar un job (tras el gate técnico+Grok).

    Es lo que hace que el enjambre APRENDA: actualiza el score del agente para
    ese task_type y siembra la lección en swarm_memory.

    quality 0..100 · success = gate verde / veredicto Grok APROBADO.
    """
    router2.seal_outcome(job_id, success, quality, what_worked, what_failed)


def inject_recall(job_id: int) -> str | None:
    """Devuelve el bloque de memoria a anteponer al prompt del agente al arrancar.

    El ejecutor lo pega arriba del prompt antes de mandárselo al modelo.
    """
    row = q("SELECT recalled FROM dispatch_queue WHERE id=%s", (job_id,))
    if not row or not row[0].get("recalled"):
        return None
    mem = row[0]["recalled"]
    lines = [f"- ✅ {m['what_worked']}" + (f"  (⚠️ {m['what_failed']})" if m.get("what_failed") else "")
             for m in mem if m.get("what_worked")]
    return ("MEMORIA DEL ENJAMBRE (lecciones de tareas parecidas):\n" + "\n".join(lines)) if lines else None


if __name__ == "__main__":
    print(tick())

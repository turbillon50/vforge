#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
04:00 AM — CONSTRUCCIÓN AUTÓNOMA
Si hay tareas marcadas como NOCTURNAS en dispatch_queue, el ejecutor las hace
mientras Luis duerme: investigaciones largas, generación de docs, etc.

Una tarea es "nocturna" si está en cola y cumple cualquiera de:
  - metadata->>'night' = 'true'
  - source = 'night'
  - lower(coalesce(command,prompt)) contiene '[noche]'

Motor de ejecución: claude CLI (mismo que el resto del protocolo; sin depender
de que el enjambre esté arriba). Cada tarea se marca running -> done/failed con
su resultado real. Topes duros para no comerse la madrugada:
  MAX_TASKS tareas · MAX_MIN minutos de pared total.

Para encolar una tarea nocturna desde cualquier lado:
  INSERT INTO dispatch_queue (prompt, agent, status, source, metadata, priority)
  VALUES ('Investiga X y escribe doc', 'claude', 'queued', 'night',
          '{"night":true}'::jsonb, 5);

Salida: state/build.json
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import q, execute, llm, save_state, mem, log, now_cancun  # noqa

MAX_TASKS = 5
MAX_MIN = 90
PER_TASK_TIMEOUT = 600   # 10 min por tarea


def pick_tasks():
    return q(f"""
        SELECT id, agent, source,
               coalesce(command, prompt) AS task,
               coalesce(metadata,'{{}}'::jsonb) AS metadata, priority
        FROM dispatch_queue
        WHERE status IN ('queued','pending')
          AND ( metadata->>'night' = 'true'
                OR source = 'night'
                OR lower(coalesce(command, prompt, '')) LIKE '%%[noche]%%' )
        ORDER BY priority DESC NULLS LAST, created_at ASC
        LIMIT {MAX_TASKS}
    """)


def run_task(t):
    tid = t["id"]
    task = (t["task"] or "").strip()
    if not task:
        execute("UPDATE dispatch_queue SET status='failed', error=%s, "
                "completed_at=now() WHERE id=%s", ("tarea vacía", tid))
        return {"id": tid, "status": "failed", "error": "tarea vacía"}

    execute("UPDATE dispatch_queue SET status='running', started_at=now() "
            "WHERE id=%s", (tid,))
    log(f"  -> ejecutando #{tid}: {task[:90]}")

    prompt = (
        "Eres V/Vulcano ejecutando una tarea nocturna autónoma de la fábrica de "
        "Luis. Hazla COMPLETA y entrega el resultado final accionable (no pidas "
        "permiso, no preguntes). Si es investigación, entrega conclusiones; si es "
        "doc, entrégala lista. Sé concreto.\n\nTAREA:\n" + task
    )
    result = llm(prompt, timeout=PER_TASK_TIMEOUT)
    if result:
        execute("UPDATE dispatch_queue SET status='done', result=%s, "
                "completed_at=now() WHERE id=%s", (result[:8000], tid))
        log(f"  ✓ #{tid} done ({len(result)} chars)")
        return {"id": tid, "status": "done", "chars": len(result),
                "task": task[:120], "preview": result[:300]}
    execute("UPDATE dispatch_queue SET status='failed', "
            "error='ejecutor no produjo salida', completed_at=now() WHERE id=%s",
            (tid,))
    log(f"  ✗ #{tid} sin salida")
    return {"id": tid, "status": "failed", "task": task[:120],
            "error": "ejecutor no produjo salida"}


def main():
    dt = now_cancun()
    log(f"=== 04:00 CONSTRUCCIÓN AUTÓNOMA — {dt.isoformat()} ===")
    tasks = pick_tasks()
    log(f"tareas nocturnas en cola: {len(tasks)}")

    results = []
    start = time.time()
    for t in tasks:
        if (time.time() - start) / 60 > MAX_MIN:
            log(f"tope de {MAX_MIN} min alcanzado — paro")
            break
        results.append(run_task(t))

    done = sum(1 for r in results if r["status"] == "done")
    failed = sum(1 for r in results if r["status"] == "failed")
    report = {"fecha": dt.isoformat(), "encoladas": len(tasks),
              "ejecutadas": len(results), "done": done, "failed": failed,
              "detalle": results}
    save_state("build.json", report)

    if results:
        mem(f"🏗️ Construcción autónoma: {done} listas, {failed} fallidas "
            f"de {len(tasks)} en cola.", agent="noche-s4")
    log(f"resultado: done={done} failed={failed}")
    log("=== s4 OK ===")


if __name__ == "__main__":
    main()

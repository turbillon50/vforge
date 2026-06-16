#!/usr/bin/env python3
"""esfera_split — Esferas que se dividen (y se vuelven a juntar).

Un job que es DEMASIADO grande no se ejecuta en bruto: la esfera lo detecta,
lo parte en sub-jobs hijos (cada uno ruteado al mejor agente), y al final una
esfera de SÍNTESIS lee todos los resultados y los consolida en el job padre.

Jerarquía sobre dispatch_queue:
    job padre (role=parent, status=split, children_total=N)
      ├─ hijo 1 (parent_task_id=padre, depth+1, role=solo)
      ├─ hijo 2 ...
      └─ síntesis (parent_task_id=padre, role=synthesis)  <- corre al final

Reglas duras:
  - MAX_DEPTH evita recursión infinita (una esfera no se parte para siempre).
  - Solo se subdivide si el LLM dice too_big Y hay >=2 subtareas reales.
  - La síntesis solo arranca cuando TODOS los hijos están 'done'.

Usa helpers de db.py (q, one, run, llm_json) y el router2.
"""
import json
import router2
from db import q, one, run, llm_json

MAX_DEPTH       = 2     # raíz -> hijos -> nietos. Más allá, se ejecuta en bruto.
MIN_SUBTASKS    = 2     # si el LLM propone <2, no vale la pena partir
MAX_SUBTASKS    = 5     # techo de fan-out por nivel

_ASSESS_SYS = (
    "Eres el planificador del Enjambre Vulcano. Decides si una tarea es demasiado "
    "grande para un solo agente y, si lo es, la partes en sub-tareas DISJUNTAS "
    "(sin solaparse) que se puedan hacer en paralelo. Responde SOLO JSON."
)


def assess(prompt: str, depth: int) -> dict:
    """Pregunta al LLM si el job se debe partir. Devuelve plan estructurado."""
    if depth >= MAX_DEPTH:
        return {"too_big": False, "reason": "max_depth alcanzado", "subtasks": []}

    schema_hint = (
        '{"too_big": bool, "reason": str, '
        '"subtasks": [{"title": str, "prompt": str, "task_type": '
        '"CODE|RESEARCH|DEBUG|TEST|DESIGN|OPS|REFACTOR|REVIEW"}]}'
    )
    out = llm_json(
        f"TAREA:\n{prompt}\n\n"
        f"¿Es demasiado grande para un agente en una sola pasada? Si sí, pártela en "
        f"{MIN_SUBTASKS}-{MAX_SUBTASKS} sub-tareas disjuntas y autocontenidas.\n"
        f"Formato EXACTO: {schema_hint}",
        system=_ASSESS_SYS,
    ) or {}
    subs = out.get("subtasks") or []
    out["too_big"] = bool(out.get("too_big")) and len(subs) >= MIN_SUBTASKS
    out["subtasks"] = subs[:MAX_SUBTASKS]
    return out


def split_job(job: dict) -> dict | None:
    """Si procede, parte `job` en hijos + síntesis y deja el padre en 'split'.

    Devuelve resumen del split, o None si no se partió (que se ejecute normal).
    """
    depth = job.get("depth", 0)
    plan  = assess(job["prompt"], depth)
    if not plan["too_big"]:
        return None

    parent_id = job["id"]
    child_ids = []

    for st in plan["subtasks"]:
        # cada hijo se rutea independientemente al mejor agente para SU tipo
        ttype  = (st.get("task_type") or "CODE").upper()
        choice = router2.pick_agent(ttype)
        cur = one("""
            INSERT INTO dispatch_queue
              (prompt, task_type, agent, status, priority, parent_task_id, depth,
               role, routed_reason, source, metadata)
            VALUES (%s,%s,%s,'pending',%s,%s,%s,'solo',%s,'esfera_split',%s::jsonb)
            RETURNING id""",
            (st["prompt"], ttype, choice["agent"],
             job.get("priority", 5), parent_id, depth + 1,
             choice["reason"], json.dumps({"title": st.get("title")}, ensure_ascii=False)))
        child_ids.append(cur["id"])

    # esfera de síntesis: espera a los hermanos y consolida. Claude por defecto
    # (mejor en SYNTHESIS según priors), pero el router decide.
    syn = router2.pick_agent("SYNTHESIS")
    one("""
        INSERT INTO dispatch_queue
          (prompt, task_type, agent, status, priority, parent_task_id, depth,
           role, routed_reason, source, metadata)
        VALUES (%s,'SYNTHESIS',%s,'pending',%s,%s,%s,'synthesis',%s,'esfera_split',%s::jsonb)
        RETURNING id""",
        (f"Consolida los resultados de las {len(child_ids)} sub-tareas del job "
         f"#{parent_id} en una entrega única y coherente.",
         syn["agent"], job.get("priority", 5) + 1,  # un pelín menos prioritario: corre al final
         parent_id, depth + 1, syn["reason"],
         json.dumps({"synthesis_for": parent_id, "children": child_ids}, ensure_ascii=False)))

    # el padre queda esperando
    run("""UPDATE dispatch_queue
           SET status='split', role='parent', children_total=%s
           WHERE id=%s""",
        (len(child_ids), parent_id))

    return {"parent": parent_id, "children": child_ids,
            "reason": plan.get("reason"), "n": len(child_ids)}


def synthesize_ready() -> list[int]:
    """Encuentra esferas de síntesis cuyos hermanos YA terminaron y las corre.

    Llamar en cada ciclo del daemon. Devuelve los parent_id consolidados.
    """
    # síntesis pendientes cuyos hermanos (mismos padre, role=solo) están todos cerrados
    pendientes = q("""
        SELECT s.id AS syn_id, s.parent_task_id AS parent_id, s.agent
        FROM dispatch_queue s
        WHERE s.role='synthesis' AND s.status='pending'
          AND NOT EXISTS (
            SELECT 1 FROM dispatch_queue c
            WHERE c.parent_task_id = s.parent_task_id
              AND c.role='solo'
              AND c.status NOT IN ('done','failed','error','cancelled'))
    """)

    consolidados = []
    for p in pendientes:
        _run_synthesis(p["syn_id"], p["parent_id"], p["agent"])
        consolidados.append(p["parent_id"])
    return consolidados


def _run_synthesis(syn_id: int, parent_id: int, agent: str):
    """Lee todos los resultados de los hijos y los funde en el job padre."""
    run("UPDATE dispatch_queue SET status='synthesizing' WHERE id=%s", (syn_id,))

    hijos = q("""SELECT id, agent, task_type, result, error, status,
                        metadata->>'title' AS title
                 FROM dispatch_queue
                 WHERE parent_task_id=%s AND role='solo'
                 ORDER BY id""", (parent_id,))
    padre = one("SELECT prompt FROM dispatch_queue WHERE id=%s", (parent_id,))

    partes = []
    fallidos = 0
    for h in hijos:
        ok = h["status"] == "done"
        fallidos += 0 if ok else 1
        cuerpo = h["result"] if ok else f"[FALLÓ: {h.get('error') or 'sin detalle'}]"
        partes.append(f"### {h.get('title') or h['task_type']}  (esfera: {h['agent']})\n{cuerpo}")

    consolidado = llm_json(
        f"TAREA ORIGINAL:\n{padre['prompt']}\n\n"
        f"RESULTADOS DE LAS SUB-ESFERAS:\n\n" + "\n\n".join(partes) + "\n\n"
        "Consolida todo en UNA entrega final coherente, sin repetir, resolviendo "
        "contradicciones entre sub-resultados. Responde JSON: "
        '{"entrega": str, "huecos": [str], "calidad": 0-100}',
        system="Eres la esfera de SÍNTESIS del Enjambre. Unificas, no resumes a la ligera.",
    ) or {"entrega": "\n\n".join(partes), "calidad": 60 if not fallidos else 40}

    run("""UPDATE dispatch_queue
           SET status='done', result=%s, quality=%s, completed_at=now()
           WHERE id=%s""",
        (consolidado.get("entrega"), consolidado.get("calidad"), syn_id))

    # promueve la entrega al job padre y ciérralo
    run("""UPDATE dispatch_queue
           SET status='done', result=%s, quality=%s, completed_at=now()
           WHERE id=%s""",
        (consolidado.get("entrega"), consolidado.get("calidad"), parent_id))

    # siembra lección: la subdivisión funcionó (o no)
    router2.seal_outcome(
        syn_id, success=(fallidos == 0),
        quality=float(consolidado.get("calidad", 50)),
        what_worked=f"Partir en {len(hijos)} sub-esferas y sintetizar" if fallidos == 0 else None,
        what_failed=f"{fallidos}/{len(hijos)} sub-esferas fallaron" if fallidos else None,
    )


if __name__ == "__main__":
    # corre el barrido de síntesis (lo que haría el daemon cada ciclo)
    print("síntesis consolidadas:", synthesize_ready())

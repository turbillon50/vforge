#!/usr/bin/env python3
"""esfera_compete — Competencia y selección.

Para tareas CRÍTICAS, dos agentes la resuelven en paralelo y un tercero (juez)
compara y elige. El ganador sube su score; el perdedor baja. Con el tiempo, el
router aprende quién gana en qué y deja de gastar dobles esferas donde ya hay
un especialista claro.

Flujo:
    1. start_competition(job)  -> crea fila en dispatch_competitions + 2 jobs
       contendientes (role=contender) ruteados a los 2 MEJORES agentes distintos.
    2. (los contendientes corren como cualquier job)
    3. judge_ready() -> cuando ambos terminaron, el juez compara y llama a
       resolve_competition() en SQL, que promueve al ganador al job padre.
"""
import json
import router2
from db import q, one, run, llm_json

# task_types donde SIEMPRE vale la pena competir (alto costo de equivocarse)
CRITICAL_TYPES = {"CODE", "DEBUG", "REFACTOR", "OPS"}


def is_critical(job: dict) -> bool:
    """Crítico = marcado explícito en meta, prioridad alta, o tipo sensible."""
    meta = job.get("meta") or {}
    if isinstance(meta, str):
        try: meta = json.loads(meta)
        except Exception: meta = {}
    if meta.get("critical"):
        return True
    if (job.get("priority") or 5) <= 2:        # 1-2 = máxima prioridad
        return True
    return (job.get("task_type") or "").upper() in CRITICAL_TYPES and meta.get("compete") is True


def _two_best(task_type: str) -> list[str]:
    """Los 2 mejores agentes DISTINTOS para este tipo (el segundo, excluyendo al 1º)."""
    rows = q("""
        WITH ranked AS (
          SELECT agent, ewma_quality, success_rate, jobs
          FROM agent_strengths WHERE task_type=%s
        )
        SELECT agent FROM ranked ORDER BY (0.6*ewma_quality/100 + 0.4*success_rate) DESC
    """, (task_type,))
    agents = [r["agent"] for r in rows]
    # completa con priors razonables si no hay suficiente historia
    for fallback in ("claude", "grok", "codex"):
        if fallback not in agents:
            agents.append(fallback)
    return agents[:2]


def start_competition(job: dict) -> dict:
    """Detona competencia para un job crítico. Devuelve {competition_id, jobs}."""
    task_type = (job.get("task_type") or "CODE").upper()
    contenders = _two_best(task_type)

    comp = one("""
        INSERT INTO dispatch_competitions
          (task_type, prompt, parent_job_id, contenders, status)
        VALUES (%s,%s,%s,%s,'open')
        RETURNING id""",
        (task_type, job["prompt"], job["id"], contenders))
    comp_id = comp["id"]

    child_jobs = []
    for ag in contenders:
        cur = one("""
            INSERT INTO dispatch_queue
              (prompt, task_type, agent, status, priority, parent_task_id,
               role, competition_id, routed_reason, source)
            VALUES (%s,%s,%s,'pending',%s,%s,'contender',%s,'competencia crítica','esfera_compete')
            RETURNING id""",
            (job["prompt"], task_type, ag, job.get("priority", 2), job["id"], comp_id))
        child_jobs.append({"agent": ag, "job_id": cur["id"]})

    # el padre espera el veredicto
    run("UPDATE dispatch_queue SET status='split', role='parent', competition_id=%s WHERE id=%s",
        (comp_id, job["id"]))

    return {"competition_id": comp_id, "contenders": contenders, "jobs": child_jobs}


def judge_ready() -> list[int]:
    """Encuentra competencias con ambos contendientes listos y las arbitra."""
    abiertas = q("""
        SELECT c.id, c.task_type, c.prompt, c.contenders
        FROM dispatch_competitions c
        WHERE c.status='open'
          AND NOT EXISTS (
            SELECT 1 FROM dispatch_queue j
            WHERE j.competition_id=c.id AND j.role='contender'
              AND j.status NOT IN ('done','failed','error','cancelled'))
    """)
    decididas = []
    for c in abiertas:
        _judge(c)
        decididas.append(c["id"])
    return decididas


def _judge(comp: dict):
    """El juez lee ambos resultados, puntúa y elige. Sella vía resolve_competition."""
    run("UPDATE dispatch_competitions SET status='judging' WHERE id=%s", (comp["id"],))

    jobs = q("""SELECT agent, result, error, status
                FROM dispatch_queue
                WHERE competition_id=%s AND role='contender'""", (comp["id"],))

    # el juez es el MEJOR agente que NO compitió (imparcialidad), default grok
    competidores = {j["agent"] for j in jobs}
    juez = next((a for a in ("grok", "claude", "codex") if a not in competidores), "grok")

    bloques = []
    for j in jobs:
        cuerpo = j["result"] if j["status"] == "done" else f"[FALLÓ: {j.get('error')}]"
        bloques.append(f"=== CANDIDATO {j['agent']} ===\n{cuerpo}")

    verdict = llm_json(
        f"TAREA:\n{comp['prompt']}\n\n" + "\n\n".join(bloques) + "\n\n"
        "Compara los candidatos con rigor (correctitud > completitud > claridad). "
        "Puntúa cada uno 0-100 y elige UN ganador. Responde JSON: "
        '{"winner": "<agente>", "scores": {"<agente>": int, ...}, "notes": str}',
        system=f"Eres el JUEZ imparcial del Enjambre ({juez}). No favoreces a nadie; premias lo que de verdad resuelve.",
    ) or {}

    winner = verdict.get("winner") or max(
        ((j["agent"], 1 if j["status"] == "done" else 0) for j in jobs),
        key=lambda x: x[1])[0]
    scores = verdict.get("scores") or {j["agent"]: (70 if j["status"] == "done" else 30) for j in jobs}

    run("UPDATE dispatch_competitions SET judge_agent=%s WHERE id=%s", (juez, comp["id"]))
    run("SELECT resolve_competition(%s,%s,%s::jsonb,%s)",
        (comp["id"], winner, json.dumps(scores), verdict.get("notes")))

    # memoria: qué enfoque ganó
    router2.seal_outcome(
        _winner_job(comp["id"], winner), success=True,
        quality=float(scores.get(winner, 80)),
        what_worked=f"{winner} ganó la competencia de {comp['task_type']}",
        what_failed=verdict.get("notes"))


def _winner_job(comp_id: int, winner: str) -> int:
    r = one("""SELECT id FROM dispatch_queue
               WHERE competition_id=%s AND agent=%s AND role='contender'
               ORDER BY id DESC LIMIT 1""", (comp_id, winner))
    return r["id"] if r else 0


if __name__ == "__main__":
    print("competencias arbitradas:", judge_ready())

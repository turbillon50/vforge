#!/usr/bin/env python3
"""router2 — Router del Enjambre 2.0.

Reemplaza el ruteo estático ("CODE->claude, CHAT->grok") por uno que APRENDE:
asigna cada job al agente con mejor historial REAL para ese task_type, mezclando
explotación (el mejor) con exploración (los novatos) vía route_pick_agent() en SQL.

Antes de ejecutar, además INYECTA memoria del enjambre: "la última vez que hiciste
algo así, esto funcionó / esto falló".

Depende de los helpers ya existentes en cognition/db.py: q, one, run.
"""
from db import q, one, run

# Clasificación barata por palabras clave -> task_type de la taxonomía.
# (Si el job ya trae task_type explícito, se respeta; esto es el fallback.)
_KEYWORDS = {
    "RESEARCH": ("investiga", "busca", "research", "compara precios", "competencia", "benchmark"),
    "DEBUG":    ("error", "bug", "no jala", "falla", "stacktrace", "traceback", "rompe"),
    "REFACTOR": ("refactor", "limpia", "reorganiza", "moderniza", "dedup"),
    "TEST":     ("test", "prueba unitaria", "cobertura", "jest", "pytest"),
    "REVIEW":   ("revisa", "code review", "supervisa", "valida el code"),
    "DESIGN":   ("diseño", "ui", "landing", "estilo", "vibe", "css", "tailwind"),
    "OPS":      ("deploy", "vercel", "neon", "dns", "systemd", "nginx", "servidor", "hetzner"),
    "CHAT":     ("explica", "resume", "platica", "qué opinas"),
    "SYNTHESIS":("consolida", "junta", "sintetiza", "unifica resultados"),
}


def classify(prompt: str, explicit: str | None = None) -> str:
    """task_type del job. Respeta el explícito; si no, infiere; default CODE."""
    if explicit:
        return explicit.upper()
    low = (prompt or "").lower()
    for ttype, kws in _KEYWORDS.items():
        if any(k in low for k in kws):
            return ttype
    return "CODE"


def pick_agent(task_type: str) -> dict:
    """Devuelve {agent, score, reason} usando el histórico (SQL UCB1)."""
    row = one("SELECT * FROM route_pick_agent(%s)", (task_type,))
    if not row:  # ningún candidato (tipo desconocido) -> fallback duro
        return {"agent": "claude", "score": 0.0, "reason": "fallback (sin priors)"}
    return {"agent": row["agent"], "score": float(row["score"]), "reason": row["reason"]}


def recall(task_type: str, prompt: str, k: int = 3) -> list[dict]:
    """Memoria del enjambre relevante para este job (lo que sí/no funcionó)."""
    return q("SELECT * FROM recall_memory(%s, %s, %s)", (task_type, prompt[:300], k))


def route(job: dict) -> dict:
    """Rutea UN job: clasifica -> elige agente -> inyecta memoria -> marca la fila.

    `job` es una fila de dispatch_queue (dict con id, prompt, task_type...).
    Devuelve el plan {agent, task_type, reason, recalled}.
    """
    task_type = classify(job.get("prompt", ""), job.get("task_type"))
    choice    = pick_agent(task_type)
    mem       = recall(task_type, job.get("prompt", ""))

    # Memoria como bloque que se antepone al prompt del agente.
    recalled_block = None
    if mem:
        lines = [f"- ✅ {m['what_worked']}" + (f"  (⚠️ evita: {m['what_failed']})" if m.get("what_failed") else "")
                 for m in mem if m.get("what_worked")]
        if lines:
            recalled_block = "MEMORIA DEL ENJAMBRE (lecciones de tareas parecidas):\n" + "\n".join(lines)

    run("""UPDATE dispatch_queue
           SET agent=%s, task_type=%s, routed_reason=%s, recalled=%s::jsonb
           WHERE id=%s""",
        (choice["agent"], task_type, choice["reason"],
         _json(mem), job["id"]))

    return {"agent": choice["agent"], "task_type": task_type,
            "reason": choice["reason"], "recalled": recalled_block}


def seal_outcome(job_id: int, success: bool, quality: float,
                 what_worked: str | None = None, what_failed: str | None = None):
    """Al terminar un job: actualiza el score del agente y siembra memoria.

    Llama esto desde el daemon cuando el gate (técnico+Grok) cierra el job.
    quality 0..100. `success` = gate verde / veredicto APROBADO.
    """
    job = one("SELECT agent, task_type, prompt FROM dispatch_queue WHERE id=%s", (job_id,))
    if not job:
        return
    run("SELECT record_outcome(%s,%s,%s,%s)",
        (job["agent"], job["task_type"], success, quality))
    run("UPDATE dispatch_queue SET quality=%s WHERE id=%s", (quality, job_id))

    if what_worked or what_failed:
        run("""INSERT INTO swarm_memory
                 (task_pattern, task_type, agent, what_worked, what_failed, quality, job_id)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (_pattern(job["prompt"]), job["task_type"], job["agent"],
             what_worked, what_failed, quality, job_id))


# ---- helpers internos --------------------------------------------------------
def _pattern(prompt: str) -> str:
    """Huella corta y normalizada de la tarea para el recall por similitud."""
    return " ".join((prompt or "").lower().split())[:160]


def _json(obj) -> str:
    import json
    return json.dumps(obj, default=str, ensure_ascii=False)


if __name__ == "__main__":
    # smoke test: ¿a quién mandaría cada tipo de tarea ahora mismo?
    for tt in ("CODE", "RESEARCH", "DEBUG", "OPS", "DESIGN"):
        print(f"{tt:10} -> {pick_agent(tt)}")

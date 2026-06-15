#!/usr/bin/env python3
"""
post_session.py — #1 APRENDIZAJE POST-SESIÓN.

Cuando una conversación importante (>10 turnos) queda inactiva, Claude la analiza:
  ¿qué funcionó? ¿qué falló? ¿qué patrón nuevo apareció? ¿qué debe recordar Vulcano?
y lo destila a lessons / patterns / memory — con dedup por fingerprint.

A diferencia del learning_loop del daemon (que solo VECTORIZA el resultado de cada task),
esto hace REFLEXIÓN real sobre la sesión completa.

Uso:
  python3 run.py post_session            # procesa sesiones idle no aprendidas
  python3 run.py post_session --session <id>
  python3 run.py post_session --all      # incluye sesiones cortas (testing)
"""
import json, logging
from core import q, llm, fingerprint, log_run

log = logging.getLogger("post_session")

# lessons.type tiene CHECK (acierto|error). Mapeamos lo que diga el LLM.
def _norm_type(t):
    t = (t or "").lower()
    return "error" if any(k in t for k in ("error", "fail", "bug", "fall", "mal")) else "acierto"

MIN_TURNS = 10
IDLE_MIN = 20  # minutos sin actividad para considerar la sesión "cerrada"

SYS = """Eres el analista de aprendizaje de Vulcano (la fábrica AI de Luis de la Torre).
Analizas el transcript de UNA sesión de trabajo y extraes aprendizaje accionable.
Sé concreto y técnico. NO inventes. Si algo no aplica, deja la lista vacía.
Responde SOLO JSON válido con este shape exacto:
{
  "worked":   ["qué funcionó, frases cortas"],
  "failed":   ["qué falló o se atoró"],
  "new_patterns": [
    {"title":"...", "problem":"...", "cause":"...", "fix":"...",
     "applies_to":["area1"], "tags":["tag1"]}
  ],
  "lessons":  [{"type":"acierto|error","area":"...","lesson":"...","fix":"..."}],
  "remember": [{"topic":"...","content":"...","importance":1-5}]
}"""


def _candidate_sessions(force_all=False):
    cond = "" if force_all else f"AND turns >= {MIN_TURNS} AND mins_idle >= {IDLE_MIN}"
    return q(f"""
        SELECT s.id, s.project_id, s.agent,
               t.turns,
               EXTRACT(EPOCH FROM (now()-s.updated_at))/60 AS mins_idle
        FROM vulcano_sessions s
        JOIN (SELECT session_id, count(*) turns FROM vulcano_memory GROUP BY session_id) t
          ON t.session_id = s.id
        WHERE COALESCE(s.learned,false)=false {cond}
        ORDER BY s.updated_at DESC LIMIT 20
    """) or []


def _transcript(session_id):
    rows = q("""SELECT role, content FROM vulcano_memory
                WHERE session_id=%s ORDER BY created_at""", (session_id,)) or []
    return "\n".join(f"[{r['role']}] {r['content']}" for r in rows)[:24000]


def _dedup_lesson(fp):
    return bool(q("SELECT 1 FROM lessons WHERE fingerprint=%s LIMIT 1", (fp,)))


def _dedup_pattern(fp):
    return bool(q("SELECT 1 FROM patterns WHERE fingerprint=%s LIMIT 1", (fp,)))


def _persist(analysis, project_id, ref):
    stats = {"lessons": 0, "patterns": 0, "remember": 0, "dups": 0}

    for ls in analysis.get("lessons", []):
        fp = fingerprint(ls.get("area"), ls.get("lesson"))
        if _dedup_lesson(fp):
            stats["dups"] += 1
            continue
        q("""INSERT INTO lessons (ts, project_id, type, area, lesson, fix, source, fingerprint, last_used_at)
             VALUES (now(),%s,%s,%s,%s,%s,'post_session',%s,now())""",
          (project_id, _norm_type(ls.get("type")), ls.get("area", ""),
           ls.get("lesson", ""), ls.get("fix", ""), fp), fetch=False)
        stats["lessons"] += 1

    for p in analysis.get("new_patterns", []):
        fp = fingerprint(p.get("title"), p.get("problem"))
        if _dedup_pattern(fp):
            stats["dups"] += 1
            continue
        q("""INSERT INTO patterns (title, problem, cause, fix, applies_to, tags,
                                   times_used, created_at, source, fingerprint, last_used_at, weight)
             VALUES (%s,%s,%s,%s,%s,%s,0,now(),'post_session',%s,now(),1.0)""",
          (p.get("title", ""), p.get("problem", ""), p.get("cause", ""), p.get("fix", ""),
           p.get("applies_to", []), p.get("tags", []), fp), fetch=False)
        stats["patterns"] += 1

    for m in analysis.get("remember", []):
        # sin embedding: brain_index.py (cron c/30m) lo vectoriza después
        q("""INSERT INTO memory (agent, type, topic, content, importance, metadata, created_at, updated_at)
             VALUES ('post_session','reflexion',%s,%s,%s,%s,now(),now())""",
          (m.get("topic", "sesion"), m.get("content", ""),
           int(m.get("importance", 3)), json.dumps({"ref": ref})), fetch=False)
        stats["remember"] += 1

    return stats


def analyze_session(session_id, project_id="vulcano"):
    txt = _transcript(session_id)
    if len(txt) < 200:
        log.info("sesión %s muy corta, skip", session_id)
        return None
    raw = llm(SYS, f"TRANSCRIPT DE LA SESIÓN:\n\n{txt}", max_tokens=2500, want_json=True)
    if not isinstance(raw, dict):
        log.warning("sesión %s: análisis no devolvió JSON", session_id)
        return None
    stats = _persist(raw, project_id, f"session:{session_id}")
    q("UPDATE vulcano_sessions SET learned=true WHERE id=%s", (session_id,), fetch=False)
    worked = "; ".join(raw.get("worked", [])[:3])
    failed = "; ".join(raw.get("failed", [])[:3])
    summary = f"✓{stats['lessons']}L {stats['patterns']}P {stats['remember']}M | worked: {worked} | failed: {failed}"
    log_run("post_session", session_id, summary, stats)
    log.info("sesión %s aprendida: %s", session_id, summary)
    return stats


def analyze_text(text, project_id="vulcano", ref="manual"):
    """Analiza un transcript pegado a mano (útil para sesiones que viven fuera de la DB)."""
    raw = llm(SYS, f"TRANSCRIPT:\n\n{text[:24000]}", max_tokens=2500, want_json=True)
    if not isinstance(raw, dict):
        return None
    stats = _persist(raw, project_id, ref)
    log_run("post_session", ref, json.dumps(stats), stats)
    return stats


def run(session_id=None, force_all=False):
    if session_id:
        return analyze_session(session_id)
    done = 0
    for s in _candidate_sessions(force_all):
        if analyze_session(s["id"], s.get("project_id") or "vulcano"):
            done += 1
    log.info("post_session: %d sesiones procesadas", done)
    return done


if __name__ == "__main__":
    run()

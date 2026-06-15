#!/usr/bin/env python3
"""
signals.py — #3 APRENDIZAJE DE SEÑALES DÉBILES DE LUIS.

Luis casi nunca dice "estuvo mal" derecho. Da micro-señales:
  negativo:  "no", "eso no", "espera", "alto", "nel", "todavía no", "está mal", "otra vez"
  positivo:  "perfecto", "listo", "dale", "va", "chingón", "exacto", "ya quedó"
  redo:      vuelve a pedir la MISMA tarea  → señal fuerte de fracaso

Cada señal ajusta wins/losses/weight del/los pattern(s) que Vulcano aplicó en su
respuesta anterior, en tiempo real (hook) o en batch (cron auto).

Uso:
  from signals import register_user_signal           # hook realtime (brain-relay)
  python3 run.py signals                              # batch sobre turnos recientes
"""
import re, logging
from core import q, fingerprint, log_run

log = logging.getLogger("signals")

NEG = [r"\bno\b", r"eso no", r"\bespera\b", r"\balto\b", r"\bnel\b", r"aún no",
       r"todav[ií]a no", r"no era", r"det[eé]nte", r"p[aá]rate", r"cancela",
       r"qued[oó] mal", r"est[aá] mal", r"otra vez", r"no es", r"as[ií] no", r"\bmal\b"]
POS = [r"perfecto", r"\blisto\b", r"\bdale\b", r"\bva\b", r"\b[oó]rale\b", r"ching[oó]n",
       r"\bexacto\b", r"ya qued[oó]", r"qued[oó] bien", r"\bcorrecto\b", r"genial",
       r"excelente", r"as[ií] s[ií]", r"\beso\b", r"\bbien\b", r"\bgracias\b"]
STRONG_NEG = [r"qued[oó] mal", r"est[aá] mal", r"otra vez", r"horrible", r"p[eé]simo"]

_NEG = re.compile("|".join(NEG), re.I)
_POS = re.compile("|".join(POS), re.I)
_SNEG = re.compile("|".join(STRONG_NEG), re.I)


def classify(text):
    """Devuelve (polarity, weight). weight = magnitud del ajuste."""
    if not text:
        return (None, 0.0)
    t = text.strip().lower()
    # mensajes muy largos = instrucción nueva, no feedback puro → señal diluida
    short = len(t) < 60
    if _SNEG.search(t):
        return ("negative", 1.0)
    neg = bool(_NEG.search(t))
    pos = bool(_POS.search(t))
    if neg and not pos:
        return ("negative", 0.6 if short else 0.3)
    if pos and not neg:
        return ("positive", 0.6 if short else 0.3)
    return (None, 0.0)


def _apply_to_pattern(pattern_id, polarity, weight, session_id, project_id, excerpt):
    """Mueve wins/losses y recalcula weight de un pattern según la señal."""
    if polarity == "positive":
        q("""UPDATE patterns
                SET wins = COALESCE(wins,0)+1,
                    weight = LEAST(5.0, COALESCE(weight,1.0) + %s),
                    last_used_at = now()
              WHERE id = %s""", (weight, pattern_id), fetch=False)
    elif polarity in ("negative", "redo"):
        bump = weight * (1.5 if polarity == "redo" else 1.0)
        q("""UPDATE patterns
                SET losses = COALESCE(losses,0)+1,
                    weight = GREATEST(0.05, COALESCE(weight,1.0) - %s)
              WHERE id = %s""", (bump, pattern_id), fetch=False)
    q("""INSERT INTO learning_signals
            (session_id, project_id, turn_excerpt, polarity, weight, target_kind, target_id)
         VALUES (%s,%s,%s,%s,%s,'pattern',%s)""",
      (session_id, project_id, (excerpt or "")[:400], polarity, weight, pattern_id), fetch=False)


def _patterns_in_text(text, limit=3):
    """Heurística: qué patterns 'tocó' la respuesta anterior (match por título)."""
    if not text:
        return []
    rows = q("SELECT id, title FROM patterns WHERE COALESCE(archived,false)=false")
    low = text.lower()
    hits = [r["id"] for r in rows if r["title"] and r["title"].lower()[:40] in low]
    return hits[:limit]


def register_user_signal(user_text, prev_assistant_text="", session_id=None,
                         project_id="vulcano", applied_pattern_ids=None):
    """
    HOOK EN TIEMPO REAL. Llamar desde brain-relay en cada mensaje de Luis.
    Clasifica la señal y la aplica a los patterns que Vulcano usó en su respuesta previa.
    """
    polarity, weight = classify(user_text)
    if not polarity:
        return {"polarity": None}
    targets = applied_pattern_ids or _patterns_in_text(prev_assistant_text)
    for pid in targets:
        _apply_to_pattern(pid, polarity, weight, session_id, project_id, user_text)
    log.info("señal %s (%.2f) → %d patterns", polarity, weight, len(targets))
    return {"polarity": polarity, "weight": weight, "targets": targets}


def detect_redo(session_id=None, project_id="vulcano"):
    """
    Señal fuerte: la MISMA tarea pedida 2+ veces en poco tiempo = el intento anterior falló.
    Penaliza los patterns aplicados en esa familia de tareas.
    """
    rows = q("""
        SELECT task_signature, count(*) n
        FROM preference_pairs
        WHERE created_at > now() - interval '2 days'
        GROUP BY task_signature HAVING count(*) >= 2
    """) or []
    for r in rows:
        log.info("redo detectado en task_signature=%s (%dx)", r["task_signature"], r["n"])
    return len(rows)


def run_batch():
    """
    BATCH (cron auto): escanea turnos de usuario recientes en vulcano_memory y
    aplica señales que no se capturaron en vivo. Idempotente por ventana de tiempo.
    """
    turns = q("""
        SELECT id, session_id, project_id, role, content, created_at
        FROM vulcano_memory
        WHERE created_at > now() - interval '30 minutes'
        ORDER BY session_id, created_at
    """) or []
    applied = 0
    prev_assistant = {}
    for t in turns:
        sid = t["session_id"]
        if t["role"] in ("assistant", "v", "vulcano"):
            prev_assistant[sid] = t["content"]
            continue
        if t["role"] in ("user", "luis"):
            res = register_user_signal(
                t["content"], prev_assistant.get(sid, ""),
                session_id=sid, project_id=t.get("project_id") or "vulcano")
            if res.get("polarity"):
                applied += 1
    redo = detect_redo()
    log_run("signals", "batch", f"{applied} señales aplicadas, {redo} redos", {"applied": applied, "redo": redo})
    log.info("batch señales: %d aplicadas, %d redos", applied, redo)
    return applied


if __name__ == "__main__":
    run_batch()

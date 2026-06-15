"""
learning.py — CAPA 2: aprendizaje por refuerzo desde Luis.

Bucle de refuerzo simple y honesto (no RL de gradientes; refuerzo de heurísticas):

  Luis dice "eso estuvo mal" / "perfecto"
        │
        ▼
  record_feedback(rating)            ← guarda la señal cruda
        │
        ▼
  _vulcano_learn()                   ← destila la lección y AJUSTA heurísticas
        │                              (+rating sube weight; -rating crea anti-patrón)
        ▼
  active_rules(scope)                ← lo que V inyecta en su prompt el SIGUIENTE turno

El cambio de comportamiento es concreto: las reglas con weight>0.3 entran al
prompt del sistema de V, ordenadas por weight. Una regla castigada cae bajo el
umbral y deja de influir; una premiada sube y domina.

CLI:
  python3 learning.py feedback -2 "puso maxDuration=60" "Vercel cortó la request" --session s1
  python3 learning.py learn
  python3 learning.py rules global
"""
import sys

from db import q, one, run, llm


# rating textual → entero, para que Luis dicte por voz sin pensar
RATING_WORDS = {
    "perfecto": 2, "excelente": 2, "exacto": 2, "asi": 1, "bien": 1, "ok": 1,
    "mas o menos": 0, "meh": 0,
    "mal": -1, "flojo": -1, "no": -1,
    "pesimo": -2, "horrible": -2, "eso estuvo mal": -2, "fatal": -2,
}


def parse_rating(text):
    t = (text or "").strip().lower()
    if t.lstrip("+-").isdigit():
        return max(-2, min(2, int(t)))
    for word, val in RATING_WORDS.items():
        if word in t:
            return val
    return 0


def record_feedback(rating, action_taken, result="", session_id=None, context=None):
    """Guarda la señal cruda de Luis. Devuelve el id."""
    row = run(
        """
        INSERT INTO feedback (session_id, action_taken, result, luis_rating, context)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (session_id, action_taken, result, rating,
         __import__("json").dumps(context or {})),
    )
    return str(row["id"])


def _scope_of(context):
    """Deriva el scope de una heurística desde el contexto del feedback."""
    context = context or {}
    if context.get("project"):
        return f"project:{context['project']}"
    if context.get("task_type"):
        return f"task:{context['task_type']}"
    return "global"


def _vulcano_learn(batch=20):
    """Procesa feedback nuevo → crea/ajusta heurísticas. El corazón del refuerzo.

    Reglas del aprendizaje:
      rating >= +1  → si hay regla equivalente, sube weight y wins; si no, crea
                      una regla POSITIVA destilada ("haz X cuando Y").
      rating <= -1  → baja weight de la regla causante (si existe) y crea/sube
                      un ANTI-PATRÓN ("NO hagas X cuando Y") con weight alto.
      rating == 0   → solo se archiva, no mueve heurísticas.
    """
    pend = q(
        "SELECT * FROM feedback WHERE processed=false ORDER BY created_at LIMIT %s",
        (batch,),
    )
    learned = []
    for fb in pend:
        rating = fb["luis_rating"]
        scope = _scope_of(fb["context"])
        if rating == 0:
            run("UPDATE feedback SET processed=true WHERE id=%s", (fb["id"],))
            continue

        # Destila trigger+rule con el LLM (fallback determinista si no responde).
        distilled = _distill(fb, positive=rating > 0)
        trigger, rule = distilled["trigger"], distilled["rule"]
        delta = 0.6 * rating  # ±0.6 / ±1.2

        existing = one(
            "SELECT * FROM heuristics WHERE scope=%s AND trigger=%s", (scope, trigger))
        if existing:
            new_w = max(0.0, min(5.0, existing["weight"] + delta))
            run(
                """UPDATE heuristics SET weight=%s, rule=%s,
                     hits=hits+1, wins=wins+%s, active=(%s>0.2), updated_at=now()
                   WHERE id=%s""",
                (new_w, rule, 1 if rating > 0 else 0, new_w, existing["id"]),
            )
        else:
            run(
                """INSERT INTO heuristics (scope, trigger, rule, weight, source_feedback_id)
                   VALUES (%s,%s,%s,%s,%s)
                   ON CONFLICT (scope, trigger) DO UPDATE SET
                     weight = LEAST(5.0, heuristics.weight + EXCLUDED.weight),
                     updated_at = now()""",
                (scope, trigger, rule, max(0.5, abs(delta)), fb["id"]),
            )
        # Persiste la lección en el propio feedback y conéctala al grafo.
        run("UPDATE feedback SET processed=true, lesson=%s WHERE id=%s",
            (rule, fb["id"]))
        _link_lesson_to_graph(fb, rule)
        learned.append({"scope": scope, "trigger": trigger, "rule": rule, "delta": delta})
    return learned


def _distill(fb, positive):
    """LLM destila (trigger, rule). Fallback: usa action/result crudos."""
    from db import llm_json
    sign = "POSITIVA (reforzar)" if positive else "ANTI-PATRÓN (evitar)"
    data = llm_json(
        f"Feedback de Luis sobre Vulcano. Acción: {fb['action_taken']}. "
        f"Resultado: {fb['result']}. Rating: {fb['luis_rating']}.\n"
        f"Genera una heurística {sign} como JSON "
        '{"trigger":"cuándo aplica (corto)","rule":"qué hacer/evitar (imperativo, corto)"}',
        system="Destilas lecciones operativas para un agente de software.",
    )
    if data and data.get("trigger") and data.get("rule"):
        return data
    verb = "HAZ" if positive else "NO HAGAS"
    return {"trigger": fb["action_taken"][:80],
            "rule": f"{verb}: {fb['action_taken'][:120]} (resultado: {fb['result'][:80]})"}


def _link_lesson_to_graph(fb, rule):
    """Conecta la lección al World Model: Lesson -[LEARNED_FROM]-> Project."""
    try:
        import world_model as wm
        ctx = fb["context"] or {}
        lesson_id = wm.upsert_node("Lesson", rule[:120],
                                   rating=fb["luis_rating"])
        if ctx.get("project"):
            wm.upsert_node("Project", ctx["project"])
            rel = "SUCCEEDED_WITH" if fb["luis_rating"] > 0 else "FAILED_WITH"
            wm.link(f"Lesson:{rule[:120]}", f"Project:{ctx['project']}", rel)
        return lesson_id
    except Exception:  # noqa: BLE001
        return None


def active_rules(scope="global", limit=12):
    """Lo que V inyecta en su prompt el siguiente turno. ESTO cambia el comportamiento.

    Devuelve global + el scope específico (proyecto/task), ordenado por weight.
    """
    rows = q(
        """SELECT scope, trigger, rule, weight FROM heuristics
           WHERE active AND weight > 0.3 AND scope IN ('global', %s)
           ORDER BY weight DESC LIMIT %s""",
        (scope, limit),
    )
    return rows


def render_rules_for_prompt(scope="global"):
    """Texto listo para pegar en el system prompt de V."""
    rows = active_rules(scope)
    if not rows:
        return ""
    lines = ["# HEURÍSTICAS APRENDIDAS DE LUIS (respétalas):"]
    for r in rows:
        lines.append(f"- ({r['trigger']}) → {r['rule']}  [w={r['weight']:.1f}]")
    return "\n".join(lines)


# ------------------------------------------------------------------- CLI ------
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "feedback":
        rating = parse_rating(sys.argv[2])
        action = sys.argv[3]
        result = sys.argv[4] if len(sys.argv) > 4 else ""
        sess = None
        if "--session" in sys.argv:
            sess = sys.argv[sys.argv.index("--session") + 1]
        fid = record_feedback(rating, action, result, session_id=sess)
        print(f"feedback {fid} (rating={rating})")
    elif cmd == "learn":
        out = _vulcano_learn()
        print(f"{len(out)} heurísticas ajustadas:")
        for h in out:
            print(f"  [{h['scope']}] Δ{h['delta']:+.1f}  {h['rule']}")
    elif cmd == "rules":
        print(render_rules_for_prompt(sys.argv[2] if len(sys.argv) > 2 else "global"))
    else:
        print(__doc__)

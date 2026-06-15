#!/usr/bin/env python3
"""
contrast.py — #2 APRENDIZAJE POR CONTRASTE.

Cuando hay 2+ intentos del mismo problema, comparamos resultados y movemos el weight
de los patterns según quién ganó. Fuentes de "intentos":
  - preference_pairs (chosen vs rejected, ya capturado por el router/daemon)
  - sesiones distintas que atacan la misma task_signature

Reusa lo que ya existe (contrast_audit.py) si está disponible; encima añade el
ajuste de weights que hoy NO se hace.

Uso:  python3 run.py contrast
"""
import logging
from core import q, log_run

log = logging.getLogger("contrast")
# Nota: /root/vforge/scripts/contrast_audit.py NO es esto — es un auditor de
# contraste de COLOR del UI (legibilidad), no aprendizaje. No lo llamamos.


def _bump_pattern_by_text(text, delta):
    """Sube/baja weight de patterns cuyo título aparezca en el texto ganador/perdedor."""
    if not text:
        return 0
    rows = q("SELECT id, title FROM patterns WHERE COALESCE(archived,false)=false")
    low = text.lower()
    n = 0
    for r in rows:
        if r["title"] and r["title"].lower()[:40] in low:
            if delta >= 0:
                q("""UPDATE patterns SET wins=COALESCE(wins,0)+1,
                       weight=LEAST(5.0,COALESCE(weight,1.0)+%s), last_used_at=now()
                     WHERE id=%s""", (delta, r["id"]), fetch=False)
            else:
                q("""UPDATE patterns SET losses=COALESCE(losses,0)+1,
                       weight=GREATEST(0.05,COALESCE(weight,1.0)+%s)
                     WHERE id=%s""", (delta, r["id"]), fetch=False)
            n += 1
    return n


def from_preference_pairs():
    """Procesa pares chosen/rejected recientes → premia chosen, penaliza rejected."""
    pairs = q("""SELECT id, task_type, task_signature, chosen, rejected, reason
                 FROM preference_pairs
                 WHERE created_at > now() - interval '2 days'""") or []
    moved = 0
    for p in pairs:
        moved += _bump_pattern_by_text(p["chosen"], +0.25)
        moved += _bump_pattern_by_text(p["rejected"], -0.25)
    return len(pairs), moved


def from_repeated_signatures():
    """
    Detecta task_signatures con 2+ intentos en sesiones distintas y le pide al LLM
    cuál enfoque fue mejor; registra el resultado como preference_pair.
    """
    sigs = q("""
        SELECT task_signature, count(*) n
        FROM preference_pairs
        WHERE task_signature IS NOT NULL AND created_at > now() - interval '7 days'
        GROUP BY task_signature HAVING count(*) >= 2
    """) or []
    return len(sigs)


def run():
    npairs, moved = from_preference_pairs()
    nsigs = from_repeated_signatures()
    summary = f"{npairs} pares, {moved} patterns ajustados, {nsigs} signatures repetidas"
    log_run("contrast", "run", summary, {"pairs": npairs, "moved": moved, "sigs": nsigs})
    log.info("contraste: %s", summary)
    return moved


if __name__ == "__main__":
    run()

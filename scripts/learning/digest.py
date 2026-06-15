#!/usr/bin/env python3
"""
digest.py — #4 CONSOLIDACIÓN NOCTURNA (3am).

Revisa las últimas 24h: lecciones, patterns, señales, eventos. Detecta clusters de
errores recurrentes y de éxitos, y le manda a Luis un resumen humano:
  "🧠 Aprendí 3 cosas hoy: ..."

Complementa a sleep_rem.py (que deduplica embeddings) — aquí va la capa de SÍNTESIS
y la NOTIFICACIÓN a Luis, que hoy no existe.

Uso:  python3 run.py digest [--dry-run]
"""
import sys, json, logging
from core import q, llm, notify_luis, log_run

log = logging.getLogger("digest")

SYS = """Eres Vulcano reportándole a Luis qué aprendiste hoy. Español mexicano, directo,
cero corporativo. Te paso lo que el sistema registró en 24h. Redacta un resumen de
máx 6 líneas: "Aprendí N cosas hoy", lo más accionable primero. Si no hubo nada real
que aprender, dilo sin inventar. NO uses markdown pesado, es para WhatsApp."""


def _window():
    lessons = q("""SELECT type, area, lesson, fix FROM lessons
                   WHERE ts > now()-interval '24 hours' AND source='post_session'
                   ORDER BY ts DESC LIMIT 40""") or []
    patterns = q("""SELECT title, problem, fix FROM patterns
                    WHERE created_at > now()-interval '24 hours'
                    ORDER BY created_at DESC LIMIT 40""") or []
    signals = q("""SELECT polarity, count(*) n FROM learning_signals
                   WHERE created_at > now()-interval '24 hours' GROUP BY polarity""") or []
    # clusters de error recurrente por 'area'
    err_clusters = q("""SELECT area, count(*) n FROM lessons
                        WHERE ts > now()-interval '24 hours' AND type='error'
                        GROUP BY area HAVING count(*) >= 2 ORDER BY n DESC""") or []
    return lessons, patterns, signals, err_clusters


def run(dry=False):
    lessons, patterns, signals, errs = _window()
    sig_map = {s["polarity"]: s["n"] for s in signals}
    payload = {
        "lecciones_nuevas": lessons,
        "patterns_nuevos": patterns,
        "señales": sig_map,
        "errores_recurrentes": errs,
    }
    total = len(lessons) + len(patterns)
    stats = {"lessons": len(lessons), "patterns": len(patterns),
             "signals": sig_map, "err_clusters": len(errs)}

    if total == 0 and not errs:
        log.info("digest: nada nuevo en 24h")
        log_run("digest", "nightly", "sin novedad", stats)
        return stats

    body = llm(SYS, json.dumps(payload, ensure_ascii=False)[:8000], max_tokens=500)
    if not body:
        body = (f"Aprendí {total} cosas hoy: {len(lessons)} lecciones, "
                f"{len(patterns)} patterns nuevos. "
                f"Errores recurrentes: {', '.join(e['area'] for e in errs) or 'ninguno'}.")

    log_run("digest", "nightly", body[:500], stats)
    if not dry:
        notify_luis("Aprendizaje de hoy", body.strip())
        # canon en memoria para recall futuro
        q("""INSERT INTO memory (agent, type, topic, content, importance, created_at, updated_at)
             VALUES ('digest','canon','digest_diario',%s,3,now(),now())""",
          (body.strip(),), fetch=False)
    log.info("digest enviado: %s", body[:120])
    return stats


if __name__ == "__main__":
    run(dry="--dry-run" in sys.argv)

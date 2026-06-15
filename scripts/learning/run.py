#!/usr/bin/env python3
"""
run.py — Orquestador del protocolo de aprendizaje de Vulcano.

Subcomandos:
  migrate        Aplica schema.sql (aditivo, idempotente)
  signals        Procesa señales débiles de Luis (batch)         [#3]
  post_session   Reflexión LLM de sesiones idle >10 turnos        [#1]
  contrast       Contraste de intentos + ajuste de weights        [#2]
  digest         Consolidación nocturna + reporte a Luis           [#4]
  decay          Olvido inteligente (decae + archiva)              [#5]
  auto           signals + post_session   (cada 20 min)
  night          digest + decay + sleep_rem   (3am)
  status         Estado del sistema (qué aprendió, cuánto pesa)

Flags: --dry-run (digest/decay), --session <id>, --all (post_session)
"""
import sys, os, subprocess, logging

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from core import q  # noqa

log = logging.getLogger("run")
SLEEP_REM = "/home/sleep_rem.py"


def migrate():
    import core
    sql = open(os.path.join(HERE, "schema.sql")).read()
    conn = core.db()
    try:
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        print("✓ migración aplicada")
    finally:
        conn.close()


def status():
    rows = q("""
        SELECT 'patterns' t, count(*) n, round(avg(weight)::numeric,2) w,
               count(*) FILTER (WHERE archived) arch FROM patterns
        UNION ALL
        SELECT 'lessons', count(*), round(avg(weight)::numeric,2),
               count(*) FILTER (WHERE archived) FROM lessons
    """) or []
    print("== ESTADO APRENDIZAJE ==")
    for r in rows:
        print(f"  {r['t']:9} total={r['n']:<5} weight_prom={r['w']} archivados={r['arch']}")
    runs = q("""SELECT kind, count(*) n, max(created_at)::text last
                FROM learning_runs GROUP BY kind ORDER BY 3 DESC""") or []
    print("== CORRIDAS ==")
    for r in runs:
        print(f"  {r['kind']:13} {r['n']:>4}x  último={r['last']}")
    sig = q("""SELECT polarity, count(*) n FROM learning_signals
               GROUP BY polarity""") or []
    if sig:
        print("== SEÑALES ==  " + "  ".join(f"{s['polarity']}={s['n']}" for s in sig))


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "status"
    dry = "--dry-run" in args

    if cmd == "migrate":
        return migrate()
    if cmd == "status":
        return status()

    if cmd == "signals":
        import signals; return signals.run_batch()
    if cmd == "post_session":
        import post_session
        sid = None
        if "--session" in args:
            sid = int(args[args.index("--session") + 1])
        return post_session.run(session_id=sid, force_all="--all" in args)
    if cmd == "contrast":
        import contrast; return contrast.run()
    if cmd == "digest":
        import digest; return digest.run(dry=dry)
    if cmd == "decay":
        import decay; return decay.run(dry=dry)

    if cmd == "auto":
        import signals, post_session
        signals.run_batch()
        post_session.run()
        return
    if cmd == "night":
        import digest, decay, contrast
        contrast.run()
        digest.run(dry=dry)
        decay.run(dry=dry)
        if os.path.exists(SLEEP_REM):
            try:
                subprocess.run(["python3", SLEEP_REM], timeout=300, check=False)
            except Exception as e:
                log.warning("sleep_rem: %s", e)
        return

    print(__doc__)


if __name__ == "__main__":
    main()

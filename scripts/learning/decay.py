#!/usr/bin/env python3
"""
decay.py — #5 OLVIDO INTELIGENTE.

El conocimiento que no se usa pierde peso; el muy viejo se archiva (NO se borra).
  weight *= 0.99 ^ (días desde last_used_at)
  piso: weight = 0.05
  archivar: last_used_at > 90 días  → archived=true (recuperable)

Aplica a patterns y lessons. Corre 1×/día.

Uso:  python3 run.py decay [--dry-run]
"""
import sys, logging
from core import q, log_run

log = logging.getLogger("decay")
FLOOR = 0.05
HALFLIFE = 0.99
ARCHIVE_DAYS = 90


def _decay_table(table, dry=False):
    # patterns tiene created_at; lessons usa ts. Base = última vez usado o creado.
    base = "created_at" if table == "patterns" else "ts"
    sel = q(f"""
        SELECT count(*) n,
               round(avg(weight)::numeric,3) avg_w
        FROM {table}
        WHERE COALESCE(archived,false)=false
    """)
    before = sel[0] if sel else {"n": 0, "avg_w": None}

    if not dry:
        q(f"""
            UPDATE {table}
               SET weight = GREATEST(%s, COALESCE(weight,1.0) *
                            power(%s, GREATEST(0, EXTRACT(EPOCH FROM (now()-COALESCE(last_used_at,{base})))/86400.0)))
             WHERE COALESCE(archived,false)=false
        """, (FLOOR, HALFLIFE), fetch=False)

    arch = q(f"""
        SELECT count(*) n FROM {table}
        WHERE COALESCE(archived,false)=false
          AND COALESCE(last_used_at,{base}) < now() - interval '{ARCHIVE_DAYS} days'
    """)
    to_archive = arch[0]["n"] if arch else 0
    if not dry and to_archive:
        q(f"""UPDATE {table} SET archived=true
              WHERE COALESCE(archived,false)=false
                AND COALESCE(last_used_at,{base}) < now() - interval '{ARCHIVE_DAYS} days'""",
          fetch=False)

    return {"table": table, "activos": before["n"], "avg_weight": str(before["avg_w"]),
            "archivados": to_archive}


def run(dry=False):
    stats = [_decay_table("patterns", dry), _decay_table("lessons", dry)]
    summary = " | ".join(f"{s['table']}: {s['activos']} activos, {s['archivados']} archivados" for s in stats)
    if not dry:
        log_run("decay", "daily", summary, {"tables": stats, "dry": dry})
    log.info("decay%s: %s", " (dry)" if dry else "", summary)
    return stats


if __name__ == "__main__":
    run(dry="--dry-run" in sys.argv)

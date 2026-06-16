#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02:30 AM — CONSOLIDACIÓN DE MEMORIA
V procesa las memorias del día:
  - Vectoriza las conversaciones/memoria nuevas  (brain_index.py — Jina v3)
  - Refuerza el peso de lo que SÍ se usó hoy      (lessons + patterns)
  - Decae lo que lleva tiempo sin tocarse
  - Archiva lo irrelevante (peso muy bajo)

No reinventa el motor de embeddings: invoca brain_index.py que ya existe.
La parte de pesos es aditiva y NO pisa al learning/run.py night (3am): este
refuerza por USO reciente; aquél consolida por contraste. Conviven.

Salida: state/memory.json
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import q, execute, save_state, mem, log, now_cancun, _claude_env  # noqa

BRAIN_INDEX = "/root/agents/brain_index.py"


def vectorize():
    """Reindexa el conocimiento reciente. Devuelve (ok, cola_de_log)."""
    if not os.path.exists(BRAIN_INDEX):
        log("brain_index.py no existe — salto vectorización")
        return False, "brain_index ausente"
    try:
        env = _claude_env()
        out = subprocess.run(
            ["/usr/bin/python3", BRAIN_INDEX, "--recent", "60"],
            capture_output=True, text=True, timeout=600, env=env, cwd="/root/agents",
        )
        tail = ((out.stdout or "") + (out.stderr or "")).strip()[-400:]
        ok = out.returncode == 0
        log(f"vectorización rc={out.returncode}")
        return ok, tail
    except Exception as e:
        log(f"vectorización excepción: {e}")
        return False, str(e)


def reinforce():
    """Sube peso de lo usado en 24h; baja peso de lo viejo; archiva basura."""
    stats = {}

    # refuerzo por uso reciente
    stats["lessons_reforzadas"] = execute("""
        WITH up AS (
          UPDATE lessons SET weight = LEAST(weight + 0.3, 5.0)
          WHERE archived = false AND last_used_at > now() - interval '24 hours'
          RETURNING 1) SELECT count(*) FROM up
    """) or 0
    stats["patterns_reforzados"] = execute("""
        WITH up AS (
          UPDATE patterns SET weight = LEAST(weight + 0.3, 5.0)
          WHERE archived = false AND last_used_at > now() - interval '24 hours'
          RETURNING 1) SELECT count(*) FROM up
    """) or 0

    # decay de lo que no se toca en 14 días
    stats["lessons_decaidas"] = execute("""
        WITH up AS (
          UPDATE lessons SET weight = GREATEST(weight - 0.15, 0)
          WHERE archived = false
            AND (last_used_at IS NULL OR last_used_at < now() - interval '14 days')
          RETURNING 1) SELECT count(*) FROM up
    """) or 0
    stats["patterns_decaidos"] = execute("""
        WITH up AS (
          UPDATE patterns SET weight = GREATEST(weight - 0.15, 0)
          WHERE archived = false
            AND (last_used_at IS NULL OR last_used_at < now() - interval '14 days')
          RETURNING 1) SELECT count(*) FROM up
    """) or 0

    # archivar lo irrelevante (peso ~0 y nunca usado)
    stats["lessons_archivadas"] = execute("""
        WITH up AS (
          UPDATE lessons SET archived = true
          WHERE archived = false AND weight <= 0.1
            AND coalesce(hits,0) = 0
            AND ts < now() - interval '30 days'
          RETURNING 1) SELECT count(*) FROM up
    """) or 0
    stats["patterns_archivados"] = execute("""
        WITH up AS (
          UPDATE patterns SET archived = true
          WHERE archived = false AND weight <= 0.1
            AND coalesce(times_used,0) = 0
            AND created_at < now() - interval '30 days'
          RETURNING 1) SELECT count(*) FROM up
    """) or 0

    return stats


def snapshot():
    rows = q("""
        SELECT 'lessons' t, count(*) n, count(*) FILTER (WHERE archived) arch,
               round(avg(weight)::numeric,2) w FROM lessons
        UNION ALL
        SELECT 'patterns', count(*), count(*) FILTER (WHERE archived),
               round(avg(weight)::numeric,2) FROM patterns
    """)
    return {r["t"]: {"total": r["n"], "archivados": r["arch"], "peso_prom": float(r["w"] or 0)}
            for r in rows}


def main():
    dt = now_cancun()
    log(f"=== 02:30 CONSOLIDACIÓN DE MEMORIA — {dt.isoformat()} ===")

    vec_ok, vec_tail = vectorize()
    stats = reinforce()
    snap = snapshot()

    report = {
        "fecha": dt.isoformat(),
        "vectorizacion_ok": vec_ok,
        "vectorizacion_tail": vec_tail,
        "pesos": stats,
        "snapshot": snap,
    }
    save_state("memory.json", report)
    mem("🧠 Consolidación de memoria: "
        f"vec={'ok' if vec_ok else 'falló'} · "
        f"reforzadas L{stats['lessons_reforzadas']}/P{stats['patterns_reforzados']} · "
        f"archivadas L{stats['lessons_archivadas']}/P{stats['patterns_archivados']}",
        agent="noche-s2")

    log(f"pesos: {stats}")
    log(f"snapshot: {snap}")
    log("=== s2 OK ===")


if __name__ == "__main__":
    main()

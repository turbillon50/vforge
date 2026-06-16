#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
02:00 AM — ANÁLISIS DE LA SESIÓN
Lee TODO lo que pasó en la sesión nocturna de Luis y lo destila:
  - ¿Qué construyó?
  - ¿Qué problemas se resolvieron?
  - ¿Qué quedó pendiente?
  - 3 lecciones clave (se sellan en la tabla lessons)

Fuentes (las que tengan datos en las últimas ~18h):
  vulcano_memory · dispatch_queue · conversations · vulcano_events · lessons

Salida: state/session.json  (lo consume s5_prep para el briefing de las 7am)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (q, llm_json, mem, lesson, save_state, log, now_cancun,  # noqa
                    fecha_str)

WINDOW = "18 hours"   # la "sesión nocturna" de Luis


def gather():
    sig = {}

    sig["memory"] = q(f"""
        SELECT agent, project_id, role, left(content, 600) AS content, created_at
        FROM vulcano_memory
        WHERE created_at > now() - interval '{WINDOW}'
        ORDER BY created_at DESC LIMIT 60
    """)

    sig["dispatch"] = q(f"""
        SELECT id, agent, status, source,
               left(coalesce(command, prompt, ''), 200) AS task,
               left(coalesce(result, ''), 200)          AS result,
               left(coalesce(error, ''), 200)           AS error,
               created_at, completed_at
        FROM dispatch_queue
        WHERE created_at > now() - interval '{WINDOW}'
           OR completed_at > now() - interval '{WINDOW}'
        ORDER BY created_at DESC LIMIT 60
    """)

    sig["convos"] = q(f"""
        SELECT project_id, agent, left(summary, 300) AS summary, created_at
        FROM conversations
        WHERE created_at > now() - interval '{WINDOW}'
        ORDER BY created_at DESC LIMIT 40
    """)

    # vulcano_events es opcional según despliegue
    sig["events"] = q(f"""
        SELECT * FROM vulcano_events
        WHERE created_at > now() - interval '{WINDOW}'
        ORDER BY created_at DESC LIMIT 40
    """) if _has_table("vulcano_events") else []

    return sig


def _has_table(name):
    r = q("SELECT 1 FROM information_schema.tables WHERE table_name=%s LIMIT 1",
          (name,))
    return bool(r)


def _stringify(rows):
    out = []
    for r in rows:
        parts = []
        for k, v in r.items():
            if v in (None, "", []):
                continue
            parts.append(f"{k}={v}")
        out.append(" · ".join(parts))
    return out


def analyze(sig):
    total = sum(len(v) for v in sig.values())
    if total == 0:
        log("sin actividad en la ventana — noche tranquila")
        return {
            "construido": [], "resuelto": [], "pendiente": [], "lecciones": [],
            "resumen": "Noche tranquila: sin actividad registrada en las últimas "
                       f"{WINDOW} (memory/dispatch/convos/events vacíos)."
        }

    blob = {
        "memoria_reciente": _stringify(sig["memory"])[:50],
        "tareas_dispatch": _stringify(sig["dispatch"])[:50],
        "conversaciones": _stringify(sig["convos"])[:40],
        "eventos": _stringify(sig["events"])[:30],
    }
    prompt = (
        "Eres V/Vulcano, capataz de la fábrica de software de Luis (V·Momentum / "
        "VForge). Te paso el registro CRUDO de la sesión nocturna de Luis (últimas "
        f"{WINDOW}). Analízalo como un jefe técnico que pasa lista al cierre del "
        "turno. Devuelve SOLO un JSON con esta forma EXACTA:\n"
        '{\n'
        '  "construido": ["qué construyó Luis, frases cortas, máx 6"],\n'
        '  "resuelto":   ["qué problemas se resolvieron, máx 6"],\n'
        '  "pendiente":  ["qué quedó a medias o pendiente, máx 6"],\n'
        '  "lecciones":  [\n'
        '     {"lesson":"lección clave 1","fix":"cómo aplicarla","area":"tema"},\n'
        '     {"lesson":"lección 2","fix":"...","area":"..."},\n'
        '     {"lesson":"lección 3","fix":"...","area":"..."}\n'
        '  ],\n'
        '  "resumen": "2-3 frases, español mexicano directo, cero relleno"\n'
        '}\n'
        "REGLAS: exactamente 3 lecciones, accionables y específicas (no genéricas "
        "tipo 'documentar mejor'). NO inventes nada que no esté en los datos. Si un "
        "campo no aplica, déjalo como lista vacía.\n\nDATOS:\n"
        + _json(blob)
    )
    out = llm_json(prompt, timeout=240, default=None)
    if not out:
        return {
            "construido": [], "resuelto": [], "pendiente": [],
            "lecciones": [],
            "resumen": f"Hubo {total} señales en la sesión pero el analizador LLM "
                       "no respondió. Revisar logs.",
            "_llm_fallido": True,
        }
    return out


def _json(o):
    import json
    return json.dumps(o, ensure_ascii=False, default=str)


def main():
    dt = now_cancun()
    log(f"=== 02:00 ANÁLISIS DE SESIÓN — {dt.isoformat()} ===")
    sig = gather()
    log(f"señales: memory={len(sig['memory'])} dispatch={len(sig['dispatch'])} "
        f"convos={len(sig['convos'])} events={len(sig['events'])}")

    report = analyze(sig)
    report["fecha"] = fecha_str(dt)
    report["generado"] = dt.isoformat()

    # sella las 3 lecciones
    selladas = 0
    for L in (report.get("lecciones") or [])[:3]:
        if isinstance(L, dict) and L.get("lesson"):
            lid = lesson(L["lesson"], fix=L.get("fix", ""),
                         area=L.get("area", "sesion-nocturna"),
                         source="noche-s1", weight=1.5)
            if lid:
                selladas += 1
    report["lecciones_selladas"] = selladas

    save_state("session.json", report)
    mem("📋 Análisis de sesión nocturna\n" + report.get("resumen", ""),
        agent="noche-s1")

    log(f"resumen: {report.get('resumen','')[:160]}")
    log(f"construido={len(report.get('construido',[]))} "
        f"resuelto={len(report.get('resuelto',[]))} "
        f"pendiente={len(report.get('pendiente',[]))} "
        f"lecciones_selladas={selladas}")
    log("=== s1 OK ===")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
03:00 AM — SUEÑO COGNITIVO
El daemon busca patrones PROFUNDOS que de día no se ven:
  - Correlaciones no obvias entre proyectos
  - Problemas que reaparecen en varios clientes
  - Oportunidades de mejora sistemática

Mira a lo ancho (30 días, todos los proyectos), no a lo hondo de uno solo.
Los hallazgos accionables se siembran como patterns (source='sueno') para que
el enjambre los recuerde. La oportunidad #1 se manda a Luis en el briefing.

Salida: state/dream.json
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (q, execute, llm_json, save_state, mem, log,  # noqa
                    now_cancun, fecha_str)
import json as _json


def gather():
    sig = {}

    # errores de dispatch recurrentes (mismo síntoma, varios jobs)
    sig["errores_recurrentes"] = q("""
        SELECT left(coalesce(error,''), 80) AS err, count(*) n,
               array_agg(DISTINCT coalesce(agent,'?')) agentes
        FROM dispatch_queue
        WHERE status IN ('failed','error') AND error IS NOT NULL
          AND created_at > now() - interval '30 days'
        GROUP BY left(coalesce(error,''),80)
        HAVING count(*) >= 2
        ORDER BY n DESC LIMIT 15
    """)

    # proyectos: fase, bloqueos, siguiente paso (estado a lo ancho)
    sig["proyectos"] = q("""
        SELECT id, name, domain, phase,
               left(coalesce(blocked,''),120)   AS blocked,
               left(coalesce(next_step,''),120) AS next_step,
               updated_at
        FROM brain.projects
        WHERE active = true
        ORDER BY updated_at DESC NULLS LAST LIMIT 40
    """)

    # lecciones recientes (señal de qué duele en la fábrica)
    sig["lecciones"] = q("""
        SELECT area, left(lesson,140) AS lesson, project_id, weight, hits
        FROM lessons
        WHERE archived = false AND ts > now() - interval '30 days'
        ORDER BY weight DESC, hits DESC LIMIT 40
    """)

    # patrones ya conocidos (para NO repetir hallazgos)
    sig["patrones_existentes"] = q("""
        SELECT left(title,100) AS title FROM patterns
        WHERE archived = false ORDER BY weight DESC LIMIT 40
    """)
    return sig


def dream(sig):
    have = (len(sig["errores_recurrentes"]) + len(sig["proyectos"])
            + len(sig["lecciones"]))
    if have < 3:
        log("muy poca señal a lo ancho — no hay material para soñar")
        return {"correlaciones": [], "problemas_recurrentes": [],
                "oportunidades": [],
                "resumen": "Sin suficiente material cruzado esta noche."}

    blob = {
        "errores_recurrentes": sig["errores_recurrentes"],
        "proyectos_activos": sig["proyectos"],
        "lecciones_recientes": sig["lecciones"],
        "patrones_ya_conocidos": [p["title"] for p in sig["patrones_existentes"]],
    }
    prompt = (
        "Eres V/Vulcano en modo SUEÑO COGNITIVO: a las 3am, sin presión, miras "
        "TODA la fábrica de software de Luis a la vez (todos los proyectos y "
        "clientes) buscando lo que de día no se ve. Te paso el estado cruzado de "
        "30 días. Busca:\n"
        "1) CORRELACIONES no obvias entre proyectos distintos.\n"
        "2) PROBLEMAS que reaparecen en varios clientes (mismo origen, distinto "
        "lugar).\n"
        "3) OPORTUNIDADES de mejora SISTÉMICA (arreglar una vez, beneficia a "
        "muchos).\n"
        "Devuelve SOLO JSON con esta forma:\n"
        '{\n'
        '  "correlaciones": [{"hallazgo":"...","proyectos":["a","b"],"por_que":"..."}],\n'
        '  "problemas_recurrentes": [{"problema":"...","aparece_en":["x","y"],'
        '"causa_raiz":"...","fix_sistemico":"..."}],\n'
        '  "oportunidades": [{"titulo":"...","impacto":"alto|medio","accion":"...",'
        '"aplica_a":["..."]}],\n'
        '  "resumen": "2-3 frases, lo más valioso que viste, mexicano directo"\n'
        '}\n'
        "REGLAS: no repitas los 'patrones_ya_conocidos'. Cada item específico y "
        "verificable contra los datos. Si no ves nada genuino en una categoría, "
        "lista vacía — NO inventes correlaciones de relleno. Máx 4 por categoría.\n\n"
        "DATOS:\n" + _json.dumps(blob, ensure_ascii=False, default=str)
    )
    out = llm_json(prompt, timeout=300, default=None)
    if not out:
        return {"correlaciones": [], "problemas_recurrentes": [],
                "oportunidades": [],
                "resumen": "El motor de sueño no respondió esta noche.",
                "_llm_fallido": True}
    return out


def seed_patterns(report):
    """Siembra problemas_recurrentes + oportunidades como patterns (memoria)."""
    sembrados = 0
    for pr in (report.get("problemas_recurrentes") or [])[:4]:
        title = (pr.get("problema") or "")[:140]
        if not title:
            continue
        fp = ("sueno|" + title.lower())[:300]
        if q("SELECT 1 FROM patterns WHERE fingerprint=%s LIMIT 1", (fp,)):
            continue
        rid = execute("""
            INSERT INTO patterns (title, problem, cause, fix, applies_to, tags,
                                  times_used, created_at, weight, wins, losses,
                                  archived, source, fingerprint)
            VALUES (%s,%s,%s,%s,%s,%s,0,now(),1.5,0,0,false,'sueno',%s)
            RETURNING id
        """, (title, pr.get("problema", ""), pr.get("causa_raiz", ""),
              pr.get("fix_sistemico", ""), pr.get("aparece_en", []),
              ["sueno", "recurrente"], fp))
        if rid:
            sembrados += 1
    return sembrados


def main():
    dt = now_cancun()
    log(f"=== 03:00 SUEÑO COGNITIVO — {dt.isoformat()} ===")
    sig = gather()
    log(f"material: errores_rec={len(sig['errores_recurrentes'])} "
        f"proyectos={len(sig['proyectos'])} lecciones={len(sig['lecciones'])}")

    report = dream(sig)
    report["fecha"] = fecha_str(dt)
    report["generado"] = dt.isoformat()
    report["patrones_sembrados"] = seed_patterns(report)

    save_state("dream.json", report)
    mem("🌙 Sueño cognitivo: "
        f"corr={len(report.get('correlaciones',[]))} "
        f"recurrentes={len(report.get('problemas_recurrentes',[]))} "
        f"oport={len(report.get('oportunidades',[]))}\n"
        + report.get("resumen", ""), agent="noche-s3")

    log(f"resumen: {report.get('resumen','')[:160]}")
    log(f"patrones_sembrados={report['patrones_sembrados']}")
    log("=== s3 OK ===")


if __name__ == "__main__":
    main()

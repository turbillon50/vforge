#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
06:30 AM — PREPARACIÓN DEL DÍA
V arma el briefing de Luis juntando TODO lo de la noche con el estado en vivo:
  - Estado de todos los proyectos (producción / bloqueos)
  - 3 prioridades del día
  - Mensajes importantes que llegaron de noche
  - Predicción de lo que Luis necesitará

Lee los estados de s1 (sesión), s3 (sueño) y s4 (construcción) + señales en vivo
(proyectos bloqueados, jobs fallidos 24h). El LLM redacta el briefing final.

NO manda WhatsApp (eso es a las 7am). Deja el briefing listo en:
  state/briefing.json  +  briefing_latest.md   (lo lee v_morning a las 7am)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (q, llm, save_state, load_state, mem, log, now_cancun,  # noqa
                    fecha_str, HERE)
import json as _json

BRIEFING_MD = os.path.join(HERE, "briefing_latest.md")


def live_signals():
    sig = {}
    sig["bloqueados"] = q("""
        SELECT name, domain, left(blocked,140) blocked, left(next_step,140) next_step
        FROM brain.projects
        WHERE active = true AND blocked IS NOT NULL
          AND lower(trim(blocked)) NOT IN ('','no','none','null','-')
        ORDER BY updated_at DESC NULLS LAST LIMIT 12
    """)
    sig["produccion"] = q("""
        SELECT name, domain, left(next_step,140) next_step
        FROM brain.projects
        WHERE active = true
          AND (phase ILIKE '%%produc%%' OR phase IN ('prod','venta'))
          AND coalesce(next_step,'') <> ''
        ORDER BY updated_at DESC NULLS LAST LIMIT 12
    """)
    sig["jobs_fallidos"] = q("""
        SELECT id, agent, left(coalesce(command,prompt,''),90) task,
               left(coalesce(error,''),90) error
        FROM dispatch_queue
        WHERE status IN ('failed','error') AND created_at > now() - interval '24 hours'
        ORDER BY created_at DESC LIMIT 10
    """)
    sig["mensajes"] = q("""
        SELECT agent, left(content,200) content, created_at
        FROM vulcano_memory
        WHERE created_at > now() - interval '12 hours'
          AND role = 'user'
        ORDER BY created_at DESC LIMIT 15
    """)
    return sig


def build_briefing(dt):
    session = load_state("session.json", {})
    dream = load_state("dream.json", {})
    build = load_state("build.json", {})
    sig = live_signals()

    blob = {
        "fecha": fecha_str(dt),
        "sesion_anoche": {
            "construido": session.get("construido", []),
            "pendiente": session.get("pendiente", []),
            "resumen": session.get("resumen", ""),
        },
        "sueno_cognitivo": {
            "oportunidades": dream.get("oportunidades", []),
            "problemas_recurrentes": dream.get("problemas_recurrentes", []),
        },
        "construccion_nocturna": {
            "done": build.get("done", 0),
            "detalle": [d.get("task") for d in build.get("detalle", [])
                        if d.get("status") == "done"],
        },
        "proyectos_bloqueados": sig["bloqueados"],
        "produccion_pendiente": sig["produccion"],
        "jobs_fallidos_24h": sig["jobs_fallidos"],
        "mensajes_recientes": sig["mensajes"],
    }

    prompt = (
        "Eres V, el CEO autónomo / capataz de la fábrica de Luis (V·Momentum / "
        "VForge). Son las 6:30am. Con TODO lo que pasó en la noche y el estado en "
        "vivo, redacta el BRIEFING de WhatsApp que Luis leerá al despertar. "
        "Español mexicano casual, directo, cero corporativo, cero relleno.\n\n"
        "Estructura EXACTA (texto plano, sin markdown de bloques):\n"
        "☀️ V · Briefing — " + fecha_str(dt) + "\n\n"
        "🎯 LAS 3 DE HOY:  (las 3 prioridades reales, en orden; bloqueos y jobs "
        "fallidos pesan más que pendientes)\n\n"
        "🌙 MIENTRAS DORMÍAS:  (qué hizo el protocolo nocturno: construcción "
        "autónoma + la oportunidad #1 del sueño cognitivo, si la hay)\n\n"
        "📬 OJO CON:  (mensajes importantes que llegaron de noche; si no hay, "
        "omite esta sección)\n\n"
        "🔮 VOY A NECESITAR:  (1 predicción concreta de lo que Luis pedirá hoy "
        "según el estado)\n\n"
        "Cierra con una línea de estado y firma '— V'.\n"
        "REGLAS: NO inventes nada fuera de los datos. Si algo está vacío, no lo "
        "menciones. Máx ~280 palabras.\n\nDATOS:\n"
        + _json.dumps(blob, ensure_ascii=False, default=str)
    )

    text = llm(prompt, timeout=240)
    if not text:
        # fallback determinista mínimo
        lines = ["☀️ V · Briefing — " + fecha_str(dt), ""]
        prio = []
        for b in sig["bloqueados"][:3]:
            prio.append(f"🔴 {b['name']}: {b['blocked']}")
        for f in sig["jobs_fallidos"][:2]:
            prio.append(f"⚠️ Job #{f['id']} falló: {f['task']}")
        lines.append("🎯 LAS 3 DE HOY:")
        lines += [f"{i+1}. {p}" for i, p in enumerate(prio[:3])] or ["Todo tranquilo."]
        if build.get("done"):
            lines += ["", f"🌙 Mientras dormías: {build['done']} tareas nocturnas listas."]
        lines += ["", "— V"]
        text = "\n".join(lines)
        used_llm = False
    else:
        used_llm = True

    return text, blob, used_llm


def main():
    dt = now_cancun()
    log(f"=== 06:30 PREPARACIÓN DEL DÍA — {dt.isoformat()} ===")

    text, blob, used_llm = build_briefing(dt)

    with open(BRIEFING_MD, "w", encoding="utf-8") as f:
        f.write(text)
    save_state("briefing.json", {"fecha": dt.isoformat(), "llm": used_llm,
                                 "text": text, "fuentes": blob})
    mem("📅 Briefing del día preparado (lo manda v_morning a las 7am).",
        agent="noche-s5")

    log(f"briefing listo (llm={used_llm}, {len(text)} chars) -> {BRIEFING_MD}")
    log("---- preview ----")
    log(text[:400])
    log("=== s5 OK ===")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""esfera.py — Runtime de las ESFERAS de dominio (Enjambre 3.0 · capa Empresa).

Una esfera es un ACTOR PERSISTENTE de dominio (Médica/Legal/Financiera/Operaciones/
RRHH/V-CEO). No es un modelo: es un cerebro de dominio que vive en `esferas`, tiene
memoria propia (esfera_memory), escucha el bus (esfera_events) y decide por monto
(decisions). Cuando necesita trabajo, ENCOLA jobs en dispatch_queue tagueados con su
slug y router2 elige el mejor agente (claude/grok/...). Esfera = quién/qué; agente = cómo.

Lo que hace cada esfera en un tick:
  1. MONITOREA su dominio (watch_spec)         -> puede publicar hechos
  2. DRENA su inbox del bus (eventos suscritos) -> razona y reacciona
  3. REACCIONA: emite jobs / publica eventos / abre decisiones / escala

La REACCIÓN usa el system_prompt de la esfera + su memoria de dominio recordada
(RAG vía esfera_recall) + el payload del evento. El LLM decide la jugada en JSON.

Integración: cognition/daemon.py llama esfera.tick_all() cada ciclo (junto a
enjambre2.tick()). No necesita proceso propio para empezar; cuando una esfera
requiera cadencia más fina, se le da su propio systemd que llame tick_one().
"""
import json
import logging

import bus
from db import q, one, run, llm_json, notify_luis

log = logging.getLogger("vulcano.esfera")


# ---- registro ----------------------------------------------------------------
def active_esferas():
    return q("SELECT * FROM esferas WHERE active=true ORDER BY cadence_sec ASC")


def _recall(slug, query, k=4):
    rows = q("SELECT * FROM esfera_recall(%s,%s,%s)", (slug, query[:300], k))
    return rows


def _recall_block(rows):
    if not rows:
        return ""
    lines = [f"- [{r['kind']}] {r.get('title') or ''}: {r['content']}" for r in rows]
    return "CONOCIMIENTO DE DOMINIO RELEVANTE:\n" + "\n".join(lines) + "\n\n"


# ---- emitir trabajo al enjambre (eje HOW lo resuelve router2) ----------------
def emit_job(slug, prompt, task_type="REASON", priority=5, meta=None):
    """La esfera encola un job; queda tagueado con su dominio. router2 lo rutea."""
    row = run("""INSERT INTO dispatch_queue (task_type, prompt, priority, source, esfera, metadata)
                 VALUES (%s,%s,%s,'esfera',%s,%s::jsonb) RETURNING id""",
              (task_type, prompt, priority, slug,
               json.dumps(meta or {}, ensure_ascii=False)))
    return row["id"] if row else None


# ---- decisión por jerarquía de monto -----------------------------------------
def open_decision(slug, kind, summary, money=0, reversible=True,
                  event_id=None, job_id=None):
    """Abre una decisión; la función SQL aplica la jerarquía y publica si escala.

    autonomous → ya viene 'approved' (la esfera puede actuar y registrar).
    tactical   → 'pending', V-CEO la arbitra (escucha decision.pending).
    strategic  → 'escalated', el daemon avisa a Luis por WhatsApp.
    """
    r = one("SELECT * FROM open_decision(%s,%s,%s,%s,%s,%s,%s)",
            (slug, kind, summary, money, reversible, event_id, job_id))
    auth = r["authority"] if r else "tactical"
    log.info("decisión[%s] %s → %s ($%s)", slug, kind, auth, money)
    return r


# ---- el cerebro: reacción de una esfera a un evento --------------------------
_REACT_SCHEMA = (
    '{"analysis": str, '
    '"emit_jobs": [{"prompt": str, "task_type": str, "priority": int}], '
    '"publish": [{"topic": str, "payload": object, "severity": str, "money_mxn": number}], '
    '"decision": {"needed": bool, "kind": str, "summary": str, "money_mxn": number, "reversible": bool}}'
)


def react(esf, ev):
    """La esfera `esf` razona sobre el evento `ev` y ejecuta su jugada.

    Devuelve el plan que el LLM produjo (para log/auditoría). best-effort: si el
    LLM no responde, hace ack y sigue (el evento queda registrado igual).
    """
    slug = esf["slug"]
    payload = ev.get("payload") or {}
    query = f"{ev['topic']} {json.dumps(payload, ensure_ascii=False)}"
    mem = _recall(slug, query)

    plan = llm_json(
        _recall_block(mem) +
        f"EVENTO EN EL BUS:\n  topic: {ev['topic']}\n  de: {ev['source']}\n"
        f"  severidad: {ev['severity']}  monto: {ev.get('money_mxn')}\n"
        f"  datos: {json.dumps(payload, ensure_ascii=False)}\n\n"
        "Como esfera de tu dominio, reacciona. Puedes: encolar trabajo al enjambre, "
        "publicar nuevos hechos para otras esferas, y/o abrir una decisión si hay "
        "dinero o riesgo de por medio. Si no aplica a tu dominio, deja todo vacío.\n"
        f"Responde SOLO JSON con forma: {_REACT_SCHEMA}",
        system=esf["system_prompt"],
    ) or {}

    # 1) emitir trabajo
    for j in (plan.get("emit_jobs") or [])[:5]:
        emit_job(slug, j.get("prompt", ""), (j.get("task_type") or "REASON").upper(),
                 int(j.get("priority", 5)),
                 meta={"from_event": ev["id"], "topic": ev["topic"]})

    # 2) publicar hechos derivados (así nace la cadena emergente entre esferas)
    for p in (plan.get("publish") or [])[:5]:
        bus.publish(p.get("topic", f"{slug}.note"), slug,
                    p.get("payload") or {}, p.get("severity", "info"),
                    p.get("money_mxn"))

    # 3) abrir decisión si la esfera lo juzga necesario
    dec = plan.get("decision") or {}
    if dec.get("needed"):
        open_decision(slug, dec.get("kind", "accion"), dec.get("summary", ""),
                      float(dec.get("money_mxn") or 0),
                      bool(dec.get("reversible", True)), event_id=ev["id"])

    bus.ack(ev["id"], slug)
    return plan


# ---- monitoreo de dominio (watch_spec) ---------------------------------------
def monitor(esf):
    """Chequeo proactivo del dominio. Stub honesto: cada esfera engancha aquí sus
    fuentes reales (vistas Neon, CRM, n8n). De fábrica solo registra el tick.
    Cuando detecta algo, publica un hecho al bus (no decide aquí)."""
    # Ejemplo cableable: la Financiera vigila pagos pendientes grandes.
    if esf["slug"] == "financiera":
        try:
            grandes = q("SELECT cliente, monto FROM crm_pagos_pendientes "
                        "WHERE monto > 100000 ORDER BY monto DESC LIMIT 3")
            for g in grandes:
                bus.publish("finance.large_outflow", "financiera",
                            {"cliente": g["cliente"]}, "warn", float(g["monto"]))
        except Exception:  # noqa: BLE001 — la vista puede no existir aún
            pass


# ---- ticks -------------------------------------------------------------------
def tick_one(esf, max_events=10):
    """Un tick de UNA esfera: monitorea su dominio y drena su inbox del bus."""
    res = {"esfera": esf["slug"], "reacciones": 0}
    try:
        monitor(esf)
    except Exception as e:  # noqa: BLE001
        log.warning("monitor[%s] falló: %s", esf["slug"], e)

    for ev in bus.inbox(esf["slug"], limit=max_events):
        try:
            react(esf, ev)
            res["reacciones"] += 1
        except Exception as e:  # noqa: BLE001
            log.warning("react[%s] ev %s falló: %s", esf["slug"], ev["id"], e)
            bus.ack(ev["id"], esf["slug"])   # no reintentar en bucle

    run("UPDATE esferas SET last_tick_at=now() WHERE slug=%s", (esf["slug"],))
    return res


def tick_all():
    """Tick de TODAS las esferas activas. Lo llama daemon.cycle() cada ciclo.

    V-CEO va al final: así arbitra las decision.pending que las otras esferas
    pudieron haber abierto en este mismo ciclo.
    """
    esferas = sorted(active_esferas(), key=lambda e: e["slug"] == "ceo")
    out = [tick_one(e) for e in esferas]
    escalate_pending()   # avisa a Luis de lo estratégico que quedó en cola
    log.info("esfera.tick_all: %s", out)
    return out


# ---- gobierno: arbitraje táctico y escalamiento estratégico ------------------
def arbitrate_tactical():
    """V-CEO resuelve decisiones 'pending' (tácticas, $10k–$100k).

    Las consume del bus vía sus suscripciones, pero también barre la tabla por si
    alguna se publicó sin que el evento llegara. Decide con su system_prompt.
    """
    ceo = one("SELECT * FROM esferas WHERE slug='ceo'")
    if not ceo:
        return []
    pend = q("SELECT * FROM decisions WHERE status='pending' AND authority='tactical' "
             "ORDER BY created_at ASC LIMIT 10")
    decididas = []
    for d in pend:
        mem = _recall("ceo", d["summary"])
        verdict = llm_json(
            _recall_block(mem) +
            f"DECISIÓN TÁCTICA A ARBITRAR:\n  esfera: {d['esfera']}\n  tipo: {d['kind']}\n"
            f"  resumen: {d['summary']}\n  monto: ${d['money_mxn']} MXN\n\n"
            "Como V-CEO, aprueba o rechaza con criterio de salud del negocio a 90 días. "
            'Responde JSON: {"approve": bool, "reasoning": str}',
            system=ceo["system_prompt"]) or {}
        status = "approved" if verdict.get("approve") else "rejected"
        run("UPDATE decisions SET status=%s, approver='ceo', reasoning=%s, decided_at=now() "
            "WHERE id=%s", (status, verdict.get("reasoning"), d["id"]))
        bus.publish(f"decision.{status}", "ceo",
                    {"decision_id": d["id"], "summary": d["summary"]}, "info",
                    float(d["money_mxn"]))
        decididas.append({"id": d["id"], "status": status})
    return decididas


def escalate_pending():
    """Lo estratégico (>$100k o irreversible) que quedó 'escalated' → WhatsApp a Luis.

    Marca approver='luis' provisional para no re-notificar; Luis decide fuera de banda.
    """
    esc = q("SELECT * FROM decisions WHERE status='escalated' AND approver IS NULL "
            "ORDER BY money_mxn DESC LIMIT 5")
    for d in esc:
        notify_luis(
            f"🏛️ DECISIÓN ESTRATÉGICA — esfera {d['esfera']}\n"
            f"{d['summary']}\nMonto: ${d['money_mxn']:,.0f} MXN\n"
            f"(decision #{d['id']}) — necesita tu visto bueno.", urgent=True)
        run("UPDATE decisions SET approver='luis' WHERE id=%s", (d["id"],))
    return [d["id"] for d in esc]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "tick"
    if cmd == "tick":
        print(json.dumps(tick_all(), ensure_ascii=False, indent=2))
    elif cmd == "ceo":
        print(json.dumps(arbitrate_tactical(), ensure_ascii=False, indent=2))
    elif cmd == "ls":
        for e in active_esferas():
            print(f"{e['slug']:12} cap=${e['authority_mxn']:>8.0f}  {e['name']}")

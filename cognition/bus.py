#!/usr/bin/env python3
"""bus.py — El BLACKBOARD del Enjambre 3.0: comunicación esfera↔esfera.

dispatch_queue es PULL de tareas (el enjambre jala jobs). Esto es lo otro: PUSH
de hechos. Una esfera publica un evento; las suscritas despiertan y reaccionan.
Es el patrón blackboard clásico de sistemas multi-agente (Hearsay-II): nadie le
habla a nadie directo — todos escriben/leen del pizarrón compartido.

Dos modos de entrega, por diseño (uno respalda al otro):
  · DURABLE  → tabla esfera_events. Fuente de verdad, auditable, permite replay.
               SIEMPRE funciona (va por el pooler de Neon como todo lo demás).
  · WAKE     → pg_notify('esfera_bus', id) para despertar al instante al listener.
               LISTEN/NOTIFY NO sobrevive el pooler de Neon (pgbouncer en modo
               transacción lo corta), así que el listener abre una conexión
               DIRECTA (sin '-pooler'). Si no se puede, caemos a poll cada
               POLL_SECONDS sobre la tabla — más lento pero nunca se pierde nada.

API:
  publish(topic, source, payload=..., severity=..., money=...) -> event_id
  inbox(esfera, limit=20)        -> [eventos open que matchean sus suscripciones]
  ack(event_id, esfera)          -> marca reacción; consume el evento si ya todas
  listen(on_event, esferas=None) -> bloquea escuchando el bus (para un proceso wake)
"""
import os
import json
import time
import logging
import select

import psycopg2
import psycopg2.extras

from db import DB_URL, q, one, run

log = logging.getLogger("vulcano.bus")
POLL_SECONDS = int(os.environ.get("ESFERA_BUS_POLL", "3"))


# ---- publicación / lectura (van por el pooler normal vía db.py) --------------
def publish(topic, source, payload=None, severity="info", money=None):
    """Pone un hecho en el pizarrón y dispara el wake. Devuelve el event_id."""
    row = run("SELECT esfera_publish(%s,%s,%s::jsonb,%s,%s) AS id",
              (topic, source, json.dumps(payload or {}, ensure_ascii=False),
               severity, money))
    eid = row["id"] if row else None
    log.info("bus ⇡ %s por %s (ev=%s, $%s)", topic, source, eid, money)
    return eid


def inbox(esfera, limit=20):
    """Eventos open que matchean las suscripciones de `esfera` y que no consumió."""
    return q("SELECT * FROM esfera_inbox(%s,%s)", (esfera, limit))


def ack(event_id, esfera):
    """Marca que `esfera` ya reaccionó al evento (lo consume si ya todas lo hicieron)."""
    run("SELECT esfera_ack(%s,%s)", (event_id, esfera))


# ---- listener de wake instantáneo (conexión DIRECTA, no pooler) --------------
def _direct_dsn():
    """DSN sin '-pooler': pgbouncer corta LISTEN/NOTIFY, una conexión directa no."""
    return DB_URL.replace("-pooler", "")


def listen(on_event, esferas=None, fallback_poll=True):
    """Escucha el bus y llama on_event(event_dict) por cada hecho nuevo.

    Bloquea (úsalo en su propio proceso/hilo). `esferas` opcional filtra a quién
    le importa; si es None, entrega todos los eventos open. Si LISTEN no se puede
    abrir (o se cae), cae a poll cada POLL_SECONDS sin perder eventos.
    """
    try:
        conn = psycopg2.connect(_direct_dsn(), connect_timeout=10)
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute("LISTEN esfera_bus;")
        log.info("bus: LISTEN activo (conexión directa)")
    except Exception as e:  # noqa: BLE001
        log.warning("bus: LISTEN no disponible (%s) → modo poll", e)
        conn = None

    seen_max = _max_event_id()
    while True:
        woke = False
        if conn is not None:
            try:
                if select.select([conn], [], [], POLL_SECONDS) != ([], [], []):
                    conn.poll()
                    conn.notifies.clear()    # vaciamos; releemos por id abajo (durable manda)
                    woke = True
            except Exception as e:  # noqa: BLE001
                log.warning("bus: LISTEN cayó (%s) → poll", e)
                conn = None
        if conn is None and fallback_poll:
            time.sleep(POLL_SECONDS)
            woke = True

        if not woke:
            continue
        # DURABLE manda: leemos de la tabla todo lo nuevo desde el último visto.
        nuevos = q("SELECT * FROM esfera_events WHERE id > %s AND status='open' "
                   "ORDER BY id ASC", (seen_max,))
        for ev in nuevos:
            seen_max = max(seen_max, ev["id"])
            if esferas and ev["source"] in esferas:
                continue
            try:
                on_event(ev)
            except Exception as e:  # noqa: BLE001
                log.warning("bus: on_event falló para ev %s: %s", ev["id"], e)


def _max_event_id():
    r = one("SELECT COALESCE(max(id),0) AS m FROM esfera_events")
    return r["m"] if r else 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # smoke: publica un hecho de prueba y muéstralo en el inbox de legal.
    publish("finance.large_outflow", "financiera",
            {"concepto": "pago proveedor X", "factura": "A-123"},
            severity="warn", money=250000)
    print("inbox legal:", [e["topic"] for e in inbox("legal")])

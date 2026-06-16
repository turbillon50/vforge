"""
daemon.py — CAPA 3: el daemon de conciencia continua de Vulcano.

Este proceso es lo que hace a Vulcano EXISTIR fuera de los chats. Corre 24/7 en
Hetzner (systemd) y cada ciclo:

  1. revisa el estado de proyectos, clientes, deploys y URLs,
  2. detecta anomalías (proyecto inactivo 7d, URL caída, deploy fallido, pago
     pendiente, DB lenta),
  3. proactivamente ENCOLA tareas en dispatch_queue (sin que Luis pregunte),
  4. notifica a Luis por WhatsApp solo cuando algo de verdad requiere atención,
  5. una vez al día: mantenimiento cognitivo (decay del grafo, _vulcano_learn,
     síntesis de episodios de las sesiones del día).

Diseño anti-spam: las observaciones se dedupean por (kind, subject) mientras
estén abiertas; solo se notifica una vez y se reabre si cambia la severidad.

Despliegue (systemd):  ver cognition/vulcano-daemon.service
Run manual:            python3 daemon.py once     # un ciclo
                       python3 daemon.py loop      # bucle infinito (lo usa systemd)
"""
import os
import sys
import time
import json
import logging
import datetime as dt
import urllib.request

from db import q, one, run, notify_luis
import world_model as wm
import episodic
import learning
import dream

# Capas del enjambre — guardadas: si falta un módulo, el daemon NO se cae.
try:
    import enjambre2            # 2.0: rutea/compite/divide/sintetiza jobs (eje HOW)
except Exception as _e:         # noqa: BLE001
    enjambre2 = None
try:
    import esfera               # 3.0: esferas de dominio + bus + decisiones (eje WHO)
except Exception as _e:         # noqa: BLE001
    esfera = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [daemon] %(levelname)s %(message)s")
log = logging.getLogger("vulcano.daemon")

CYCLE_SECONDS = int(os.environ.get("VULCANO_CYCLE", "300"))   # 5 min
STALE_DAYS = int(os.environ.get("VULCANO_STALE_DAYS", "7"))
HETZNER = os.environ.get("HETZNER_URL", "http://178.105.135.26")
# Hora UTC en que V "sueña". 8 UTC = 3am en Cancún (UTC-5). Configurable.
DREAM_UTC_HOUR = int(os.environ.get("VULCANO_DREAM_UTC_HOUR", "8"))


# ---------------------------------------------------- registro de anomalías ---
def observe(kind, subject, severity, detail, data=None):
    """Registra una observación. Dedupe por (kind, subject) abiertos.

    Devuelve True si es NUEVA o escaló de severidad (→ amerita notificar).
    """
    existing = one(
        "SELECT id, severity, status FROM observations "
        "WHERE kind=%s AND subject=%s AND status IN ('open','notified')",
        (kind, subject),
    )
    sev_rank = {"info": 1, "warn": 2, "critical": 3}
    if existing:
        if sev_rank[severity] > sev_rank[existing["severity"]]:
            run("UPDATE observations SET severity=%s, detail=%s, status='open', data=%s WHERE id=%s",
                (severity, detail, json.dumps(data or {}), existing["id"]))
            return True
        return False
    run(
        """INSERT INTO observations (kind, subject, severity, detail, data)
           VALUES (%s,%s,%s,%s,%s)
           ON CONFLICT (kind, subject) WHERE status IN ('open','notified')
           DO NOTHING""",
        (kind, subject, severity, detail, json.dumps(data or {})),
    )
    return True


def enqueue(prompt, task_type="CODE", priority=5, meta=None):
    """Encola una tarea para el enjambre. La fuente queda marcada como 'daemon'."""
    run(
        """INSERT INTO dispatch_queue (task_type, prompt, priority, source, metadata)
           VALUES (%s,%s,%s,'daemon',%s)""",
        (task_type, prompt, priority, json.dumps(meta or {})),
    )
    log.info("encolada tarea %s p%s: %s", task_type, priority, prompt[:60])


def resolve(kind, subject):
    run("UPDATE observations SET status='resolved', resolved_at=now() "
        "WHERE kind=%s AND subject=%s AND status IN ('open','notified')",
        (kind, subject))


# ----------------------------------------------------------------- chequeos ---
def _http_ok(url, timeout=12):
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": "vulcano-daemon"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status < 400
    except Exception:  # noqa: BLE001
        return False


def check_urls():
    """Revisa que las URLs de los proyectos respondan. Nodo Project.properties.url."""
    projects = q(
        "SELECT name, properties FROM kg_nodes "
        "WHERE type='Project' AND properties ? 'url'")
    for p in projects:
        url = (p["properties"] or {}).get("url")
        if not url:
            continue
        if not _http_ok(url):
            new = observe("url_down", p["name"], "critical",
                          f"{url} no responde", {"url": url})
            if new:
                notify_luis(f"⚠️ {p['name']} está CAÍDO: {url}", urgent=True)
                enqueue(f"Diagnostica por qué {url} ({p['name']}) no responde y "
                        "propón fix concreto.", task_type="DEBUG", priority=1)
        else:
            resolve("url_down", p["name"])


def check_stale_projects():
    """Proyecto activo sin actividad en STALE_DAYS → observación + tarea suave."""
    stale = q(
        """SELECT name, last_seen_at FROM kg_nodes
           WHERE type='Project'
             AND COALESCE((properties->>'active')::bool, true)
             AND last_seen_at < now() - (%s || ' days')::interval""",
        (STALE_DAYS,),
    )
    for p in stale:
        if observe("stale_project", p["name"], "warn",
                   f"sin actividad desde {p['last_seen_at']:%Y-%m-%d}"):
            enqueue(f"Revisa el estado de {p['name']}: ¿sigue vivo, qué falta para "
                    "el siguiente paso? Resume en 5 líneas.",
                    task_type="REASON", priority=6, meta={"project": p["name"]})


def check_deploys():
    """Consulta deploys recientes vía el relay de Hetzner (Vercel) y marca fallos."""
    try:
        body = json.dumps({"secret": os.environ.get("BRAIN_SECRET", "superclaude2025"),
                           "cmd": "vercel-recent-failed"}).encode()
        req = urllib.request.Request(f"{HETZNER}/brain/exec", data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as r:
            out = json.loads(r.read())
    except Exception as e:  # noqa: BLE001
        log.debug("check_deploys sin datos: %s", e)
        return
    for d in (out.get("failed") or []):
        if observe("deploy_failed", d.get("project", "?"), "warn",
                   d.get("error", "deploy ERROR"), d):
            enqueue(f"Deploy de {d.get('project')} falló: {d.get('error','')}. "
                    "Diagnostica y arregla.", task_type="DEBUG", priority=2,
                    meta={"project": d.get("project")})


def check_payments():
    """Pagos pendientes (CRM) → recordatorio a Luis. best-effort sobre tabla CRM."""
    try:
        pend = q("SELECT cliente, monto, dias FROM crm_pagos_pendientes "
                 "WHERE dias > 3 ORDER BY dias DESC LIMIT 5")
    except Exception:  # noqa: BLE001
        return  # la vista/tabla puede no existir aún
    for p in pend:
        if observe("payment_pending", p["cliente"], "warn",
                   f"${p['monto']} pendiente hace {p['dias']}d"):
            notify_luis(f"💰 Pago pendiente: {p['cliente']} ${p['monto']} "
                        f"({p['dias']} días).")


# ------------------------------------------------- mantenimiento cognitivo ----
def daily_maintenance():
    """Una vez al día: olvido, aprendizaje y síntesis de episodios."""
    log.info("mantenimiento cognitivo diario")
    try:
        wm.decay()
    except Exception as e:  # noqa: BLE001
        log.warning("decay falló: %s", e)
    try:
        learned = learning._vulcano_learn(batch=100)
        if learned:
            log.info("aprendió %d heurísticas hoy", len(learned))
    except Exception as e:  # noqa: BLE001
        log.warning("learn falló: %s", e)
    # Sintetiza un episodio del día con lo más relevante.
    try:
        today = q("SELECT action_taken, result, luis_rating FROM feedback "
                  "WHERE created_at::date = now()::date")
        if today:
            digest = "; ".join(f"{t['action_taken']}→{t['result']}({t['luis_rating']})"
                               for t in today)
            episodic.synthesize_episode(f"Resumen del día: {digest}")
    except Exception as e:  # noqa: BLE001
        log.warning("síntesis diaria falló: %s", e)


# ------------------------------------------------------------ sueño nocturno --
def nightly():
    """Sueño cognitivo: a las ~3am V revive el día y aprende sola (mecanismo 3).

    Idempotente por día vía dream_cycles; aunque el daemon cicle varias veces
    dentro de la hora, solo sueña una vez. Consolida el día que acaba de cerrar.
    """
    log.info("🌙 ventana de sueño — consolidando el día anterior")
    try:
        report = dream.dream(day=dt.date.today() - dt.timedelta(days=1))
        if report:
            log.info("sueño completado")
    except Exception as e:  # noqa: BLE001
        log.warning("sueño falló: %s", e)


# ----------------------------------------------------------------- ciclo ------
def cycle(state):
    """Un ciclo de conciencia. `state` persiste entre ciclos (último día corrido)."""
    log.info("— ciclo de conciencia —")
    for check in (check_urls, check_stale_projects, check_deploys, check_payments):
        try:
            check()
        except Exception as e:  # noqa: BLE001
            log.warning("%s falló: %s", check.__name__, e)

    # Enjambre 2.0 — organiza y aprende sobre los jobs (eje HOW: qué modelo).
    if enjambre2 is not None:
        try:
            enjambre2.tick()
        except Exception as e:  # noqa: BLE001
            log.warning("enjambre2.tick falló: %s", e)

    # Enjambre 3.0 — esferas de dominio: monitoreo, bus y decisiones (eje WHO).
    if esfera is not None:
        try:
            esfera.tick_all()         # cada esfera monitorea + drena su inbox del bus
            esfera.arbitrate_tactical()  # V-CEO arbitra lo táctico ($10k–$100k)
        except Exception as e:  # noqa: BLE001
            log.warning("esfera.tick falló: %s", e)

    today = dt.date.today().isoformat()
    if state.get("last_daily") != today:
        daily_maintenance()
        state["last_daily"] = today

    # Sueño cognitivo: una vez al día, dentro de la ventana de las 3am (local).
    now_utc = dt.datetime.now(dt.timezone.utc)
    if now_utc.hour == DREAM_UTC_HOUR and state.get("last_dream") != today:
        nightly()
        state["last_dream"] = today


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "once"
    state = {}
    if mode == "once":
        cycle(state)
        return
    log.info("Vulcano despierto. ciclo=%ss", CYCLE_SECONDS)
    notify_luis("🟣 Vulcano en línea — conciencia continua activa.")
    while True:
        try:
            cycle(state)
        except Exception as e:  # noqa: BLE001
            log.error("ciclo crasheó: %s", e)
        time.sleep(CYCLE_SECONDS)


if __name__ == "__main__":
    main()

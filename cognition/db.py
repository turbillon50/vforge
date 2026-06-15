"""
db.py — Conexión y utilidades compartidas por las 5 capas cognitivas de Vulcano.

Una sola fuente de verdad para:
  - el connection string de Neon (mismo pooler que bandit_router / dispatch_queue),
  - helpers de query (q / one / run),
  - el cliente LLM barato (OpenRouter) que las capas usan para SINTETIZAR
    (destilar lecciones, resumir episodios, normalizar preguntas) — NO para chatear.
  - notificación a Luis por WhatsApp vía el puente Baileys personal (puerto 3001).

Todas las capas importan de aquí. Cero duplicación de credenciales.
"""
import os
import json
import logging
import urllib.request

import psycopg2
import psycopg2.extras

log = logging.getLogger("vulcano.db")

DB_URL = os.environ.get(
    "NEON_DATABASE_URL",
    "postgresql://neondb_owner:REDACTED_BRAIN_DB@ep-super-glitter-aqj6d5g0-pooler"
    ".c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

OPENROUTER_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "REDACTED_OR_KEY",
)
# Modelo barato y rápido para síntesis interna (no es el motor de chat de V).
SYNTH_MODEL = os.environ.get("VULCANO_SYNTH_MODEL", "anthropic/claude-3.5-haiku")

# Puente WhatsApp personal de Luis (Baileys, ver CLAUDE.md).
BAILEYS_URL = os.environ.get("BAILEYS_URL", "http://178.105.135.26:3001")
BAILEYS_SECRET = os.environ.get(
    "BAILEYS_SECRET", "REDACTED_BAILEYS")
LUIS_WA = os.environ.get("LUIS_WA", "5219984292748")


def conn():
    """Conexión nueva a Neon. Cierra tú con `with conn() as c:`."""
    return psycopg2.connect(DB_URL, connect_timeout=10)


def q(sql, params=None):
    """SELECT → lista de dicts."""
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or ())
        return [dict(r) for r in cur.fetchall()]


def one(sql, params=None):
    """SELECT → primer dict o None."""
    rows = q(sql, params)
    return rows[0] if rows else None


def run(sql, params=None):
    """INSERT/UPDATE/DELETE. Devuelve la primera fila si hay RETURNING, si no None."""
    with conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or ())
        c.commit()
        if cur.description:
            row = cur.fetchone()
            return dict(row) if row else None
        return None


def llm(prompt, system=None, max_tokens=700, temperature=0.2):
    """Llamada de síntesis a OpenRouter. Devuelve texto o '' si falla.

    Se usa para destilar/resumir DENTRO del sistema cognitivo. Tolerante a
    fallos: si OpenRouter no responde, la capa hace fallback determinista.
    """
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": prompt})
    body = json.dumps({
        "model": SYNTH_MODEL,
        "messages": msgs,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode()
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "X-Title": "vulcano-cognition",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read())
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:  # noqa: BLE001 — síntesis es best-effort
        log.warning("llm() falló: %s", e)
        return ""


def llm_json(prompt, system=None, max_tokens=900):
    """Como llm() pero fuerza/parsea JSON. Devuelve dict/list o None."""
    raw = llm(prompt, system=(system or "") +
              "\nResponde SOLO JSON válido, sin markdown ni explicación.",
              max_tokens=max_tokens, temperature=0.0)
    if not raw:
        return None
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        # rescate: primer bloque {...} o [...]
        for op, cl in (("{", "}"), ("[", "]")):
            i, j = raw.find(op), raw.rfind(cl)
            if i != -1 and j > i:
                try:
                    return json.loads(raw[i:j + 1])
                except Exception:  # noqa: BLE001
                    pass
        return None


def notify_luis(text, urgent=False):
    """Manda WhatsApp a Luis por el puente Baileys. best-effort."""
    prefix = "🔴 VULCANO" if urgent else "🟣 Vulcano"
    body = json.dumps({
        "secret": BAILEYS_SECRET,
        "to": LUIS_WA,
        "message": f"{prefix}\n{text}",
    }).encode()
    req = urllib.request.Request(
        f"{BAILEYS_URL}/send", data=body,
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status < 300
    except Exception as e:  # noqa: BLE001
        log.warning("notify_luis falló: %s", e)
        return False

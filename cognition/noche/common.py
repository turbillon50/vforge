#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
common.py — Cimientos compartidos del Protocolo de Noche de Vulcano.

Todo lo que las 5 fases necesitan y que no debe repetirse:
  - db()            conexión a Neon (mismo pooler que v_morning)
  - llm(prompt)     motor de razonamiento = claude CLI (auth suscripción)
  - llm_json(...)   igual pero parsea JSON con fallback robusto
  - whatsapp(msg)   manda a Luis vía Baileys :3001
  - mem(...)        escribe en vulcano_memory
  - lesson(...)     sella una lección en la tabla lessons
  - log(msg)        línea con timestamp Cancún
  - now_cancun()    datetime local
  - STATE_DIR       carpeta de estado entre fases (handoff 2am -> 7am)

Verdad operativa: nada de esto inventa datos. Si el LLM no responde o la DB
no tiene señales, las fases lo dicen claro y no fabrican briefings falsos.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime

import psycopg2
import psycopg2.extras

# ------------------------------------------------------------------ config
DB_URL = ("postgresql://neondb_owner:npg_41DvuXKWyaHJ@"
          "ep-super-glitter-aqj6d5g0-pooler.c-8.us-east-1.aws.neon.tech/"
          "neondb?sslmode=require")
BAILEYS_URL = "http://localhost:3001/send"
BAILEYS_SECRET = "405cc28d1c2078cac90d27167bfdd53eacf426cca6f29c41"
LUIS_NUMBER = "5219984292748"

HERE = os.path.dirname(os.path.abspath(__file__))
STATE_DIR = os.path.join(HERE, "state")
os.makedirs(STATE_DIR, exist_ok=True)

MESES = ["", "ene", "feb", "mar", "abr", "may", "jun",
         "jul", "ago", "sep", "oct", "nov", "dic"]


# ------------------------------------------------------------------ tiempo
def now_cancun():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/Cancun"))
    except Exception:
        return datetime.now()


def fecha_str(dt=None):
    dt = dt or now_cancun()
    return f"{dt.day} {MESES[dt.month]} {dt.year}"


def log(msg):
    ts = now_cancun().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


# ------------------------------------------------------------------ db
def db():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    return conn


def q(sql, params=None):
    """Query de lectura -> lista de dicts. Nunca explota la fase entera."""
    try:
        conn = db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())
        rows = cur.fetchall() if cur.description else []
        cur.close()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        log(f"[db] error en query: {e}")
        return []


def execute(sql, params=None):
    try:
        conn = db()
        cur = conn.cursor()
        cur.execute(sql, params or ())
        rid = None
        if cur.description:
            row = cur.fetchone()
            rid = row[0] if row else None
        cur.close()
        conn.close()
        return rid
    except Exception as e:
        log(f"[db] error en execute: {e}")
        return None


# ------------------------------------------------------------------ motor LLM
def _claude_env():
    env = os.environ.copy()
    env["HOME"] = "/root"
    env["IS_SANDBOX"] = "1"
    # auth por suscripción, NO por API key (igual que el cron-ping validado)
    env.pop("ANTHROPIC_API_KEY", None)
    env["PATH"] = ("/usr/local/bin:/usr/bin:/bin:"
                   "/root/.nvm/versions/node/v20.20.2/bin:" + env.get("PATH", ""))
    return env


def llm(prompt, timeout=240):
    """Razona con claude CLI. Devuelve texto, o '' si falla (el caller decide)."""
    try:
        out = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True, text=True, timeout=timeout, env=_claude_env(),
        )
        txt = (out.stdout or "").strip()
        if out.returncode == 0 and txt:
            return txt
        log(f"[llm] descartado rc={out.returncode} len={len(txt)} "
            f"err={(out.stderr or '')[:200]}")
    except Exception as e:
        log(f"[llm] excepción: {e}")
    return ""


def llm_json(prompt, timeout=240, default=None):
    """Pide JSON al LLM y lo parsea aunque venga envuelto en texto/markdown."""
    raw = llm(prompt, timeout=timeout)
    if not raw:
        return default
    # quita fences ```json ... ```
    raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    # último intento: primer bloque {...} o [...] balanceado-ish
    m = re.search(r"(\{.*\}|\[.*\])", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    log(f"[llm_json] no pude parsear JSON; raw[:200]={raw[:200]}")
    return default


# ------------------------------------------------------------------ memoria
def mem(content, agent="noche", project_id="_global", role="assistant"):
    """Sella un rastro en vulcano_memory (mismo formato que v_morning)."""
    return execute(
        """INSERT INTO public.vulcano_memory (agent, project_id, role, content)
           VALUES (%s,%s,%s,%s) RETURNING id""",
        (agent, project_id, role, content),
    )


def lesson(lesson_txt, fix="", area="noche", typ="acierto",
           project_id="_global", source="noche", weight=1.0):
    # la tabla lessons solo admite type IN ('acierto','error')
    if typ not in ("acierto", "error"):
        typ = "acierto"
    """Sella una lección en la tabla lessons (con dedupe por fingerprint)."""
    fp = re.sub(r"\s+", " ", (area + "|" + lesson_txt).lower()).strip()[:300]
    existing = q("SELECT id FROM lessons WHERE fingerprint=%s LIMIT 1", (fp,))
    if existing:
        execute("UPDATE lessons SET hits=hits+1, last_used_at=now(), "
                "weight=LEAST(weight+0.2,5) WHERE id=%s", (existing[0]["id"],))
        return existing[0]["id"]
    return execute(
        """INSERT INTO lessons (ts, project_id, type, area, lesson, fix, source,
                                weight, hits, last_used_at, archived, fingerprint)
           VALUES (now(),%s,%s,%s,%s,%s,%s,%s,0,now(),false,%s) RETURNING id""",
        (project_id, typ, area, lesson_txt, fix, source, weight, fp),
    )


# ------------------------------------------------------------------ whatsapp
def whatsapp(message, to=LUIS_NUMBER):
    import requests
    r = requests.post(
        BAILEYS_URL,
        headers={"Authorization": f"Bearer {BAILEYS_SECRET}",
                 "Content-Type": "application/json"},
        json={"to": to, "message": message},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


# ------------------------------------------------------------------ estado
def save_state(name, data):
    path = os.path.join(STATE_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def load_state(name, default=None):
    path = os.path.join(STATE_DIR, name)
    if not os.path.exists(path):
        return default
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def state_fresh(name, max_age_h=8):
    """True si el archivo de estado existe y es de esta misma noche."""
    path = os.path.join(STATE_DIR, name)
    if not os.path.exists(path):
        return False
    age_h = (now_cancun().timestamp() - os.path.getmtime(path)) / 3600
    return age_h <= max_age_h

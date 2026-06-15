#!/usr/bin/env python3
"""
core.py — Núcleo compartido del protocolo de aprendizaje de Vulcano.
DB, LLM (OpenRouter + fallback ollama), notificación a Luis, dedup y logging.

Todo lo demás (signals, post_session, contrast, digest, decay) importa de aquí.
"""
import os, json, hashlib, logging, subprocess, urllib.request as _ur
from datetime import datetime, timezone
import psycopg2
import psycopg2.extras

# ── Config ────────────────────────────────────────────────────────────────
DB_URL = "postgresql://neondb_owner:REDACTED_BRAIN_DB@ep-super-glitter-aqj6d5g0-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
BRAIN_LOCAL = "http://127.0.0.1:9000"
ENGINE_NOTIFY = "http://127.0.0.1:3003/notify"   # V Momentum Engine → WhatsApp Luis
OLLAMA = "http://127.0.0.1:11434/api/generate"
LEARN_MODEL = os.environ.get("LEARN_MODEL", "anthropic/claude-sonnet-4-5")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s [%(name)s] %(message)s")


def _load_env(path="/root/.env"):
    """Carga llaves del .env del server (OPENROUTER_API_KEY, etc.) sin pisar las ya seteadas."""
    try:
        with open(path) as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except FileNotFoundError:
        pass


_load_env()
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")


# ── DB ──────────────────────────────────────────────────────────────────────
def db():
    return psycopg2.connect(DB_URL, connect_timeout=10)


def q(sql, params=None, fetch=True):
    """Query helper. Devuelve lista de dicts si fetch, si no rowcount."""
    conn = db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params or ())
        if fetch and cur.description:
            rows = cur.fetchall()
            conn.commit()
            return rows
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


# ── Util ──────────────────────────────────────────────────────────────────
def now():
    return datetime.now(timezone.utc)


def fingerprint(*parts):
    """Huella estable para dedup (normaliza espacios y mayúsculas)."""
    norm = " ".join(" ".join(str(p).lower().split()) for p in parts if p)
    return hashlib.sha1(norm.encode("utf-8")).hexdigest()


# ── LLM ─────────────────────────────────────────────────────────────────────
def llm(system, user, max_tokens=2048, want_json=False, model=None):
    """
    Cadena de motores, de mejor a fallback:
      1) claude CLI (OAuth vivo en el server, gratis, fuerte)  ← primario
      2) OpenRouter (si la key tiene crédito; hoy da 402)
      3) ollama qwen2.5:1.5b local (último recurso, débil)
    Devuelve string. Si want_json, extrae el primer bloque JSON.
    """
    out = _llm_claude_cli(system, user)
    if not out and OPENROUTER_KEY:
        out = _llm_openrouter(system, user, max_tokens, model)
    if not out:
        out = _llm_ollama(system, user)
    if want_json and out:
        out = _extract_json(out)
    return out


def _llm_claude_cli(system, user):
    """Usa el binario `claude` con el config dir más sano (mismo patrón que el daemon)."""
    prompt = f"{system}\n\n{user}"
    for cfg in ("/root/.claude", "/root/.claude-turbillon"):
        try:
            env = dict(os.environ, HOME="/root", CLAUDE_CONFIG_DIR=cfg, IS_SANDBOX="1")
            env.pop("ANTHROPIC_API_KEY", None)  # forzar OAuth, no API key
            r = subprocess.run(
                ["claude", "-p", prompt, "--output-format", "text"],
                input="", capture_output=True, text=True, timeout=120, env=env)
            out = (r.stdout or "").strip()
            if out:
                return out
        except Exception as e:
            logging.warning("claude cli (%s) failed: %s", cfg, e)
    return None


def _llm_openrouter(system, user, max_tokens, model):
    try:
        payload = json.dumps({
            "model": model or LEARN_MODEL,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }).encode()
        req = _ur.Request(
            "https://openrouter.ai/api/v1/chat/completions", data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer " + OPENROUTER_KEY,
                "HTTP-Referer": "https://vforge.site",
                "X-Title": "Vulcano-Learning",
            })
        with _ur.urlopen(req, timeout=90) as r:
            data = json.loads(r.read())
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        logging.warning("openrouter llm failed: %s", e)
        return None


def _llm_ollama(system, user):
    try:
        payload = json.dumps({
            "model": "qwen2.5:1.5b",
            "prompt": f"{system}\n\n{user}",
            "stream": False,
        }).encode()
        req = _ur.Request(OLLAMA, data=payload, headers={"Content-Type": "application/json"})
        with _ur.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get("response", "")
    except Exception as e:
        logging.warning("ollama llm failed: %s", e)
        return ""


def _extract_json(text):
    """Saca el primer objeto/array JSON de un bloque de texto del LLM."""
    if not text:
        return None
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```", 2)[1]
        if t.startswith("json"):
            t = t[4:]
    for op, cl in (("{", "}"), ("[", "]")):
        i = t.find(op)
        if i == -1:
            continue
        depth, j = 0, i
        for j in range(i, len(t)):
            if t[j] == op:
                depth += 1
            elif t[j] == cl:
                depth -= 1
                if depth == 0:
                    break
        try:
            return json.loads(t[i:j + 1])
        except Exception:
            continue
    return None


# ── Notificación a Luis ──────────────────────────────────────────────────────
def notify_luis(title, body):
    """
    Deja el evento en vulcano_events (canal garantizado) e intenta WhatsApp vía
    el Engine 3003. Nunca explota: el aprendizaje no debe caerse por una notif.
    """
    try:
        q("""INSERT INTO vulcano_events (agent, project_id, event, payload, notified, created_at)
             VALUES ('learning', 'vulcano', %s, %s, false, now())""",
          (title, json.dumps({"title": title, "body": body})), fetch=False)
    except Exception as e:
        logging.warning("notify_luis event failed: %s", e)
    try:
        data = json.dumps({"to": "luis", "message": f"🧠 {title}\n\n{body}"}).encode()
        req = _ur.Request(ENGINE_NOTIFY, data=data, headers={"Content-Type": "application/json"})
        _ur.urlopen(req, timeout=8).read()
    except Exception:
        pass  # WhatsApp es best-effort


def log_run(kind, ref, summary, stats):
    try:
        q("""INSERT INTO learning_runs (kind, ref, summary, stats, created_at)
             VALUES (%s, %s, %s, %s, now())""",
          (kind, str(ref), summary, json.dumps(stats)), fetch=False)
    except Exception as e:
        logging.warning("log_run failed: %s", e)

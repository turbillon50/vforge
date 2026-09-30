#!/usr/bin/env python3
"""Pulso · trabajos — lo que está pasando AHORA en la fábrica. Cada 10 s. Solo lectura.

Escribe /var/www/pulso/trabajos.json:
  trabajos   jobs de la cola (corriendo y en cola): agente, proyecto, qué hace, avance real, rastro
  terminados últimos cierres (30 min)
  procesos   agentes corriendo fuera de la cola (claude -p / codex exec): proyecto (su carpeta) y tiempo
  vivo       dev servers del motor vivo encendidos
  tokens     consumo de hoy (día de Cancún) por motor, medido de sus propias bitácoras
  codex_limite  % usado de la ventana de ChatGPT Pro (lo reporta el propio Codex)

Nada inventado: si algo no tiene medidor, va null. Sin secretos (se tachan patrones de llaves).
"""
import datetime as dt
import glob
import json
import os
import re
import time
import urllib.request

OUT = "/var/www/pulso/trabajos.json"
ESTADO = "/root/fase0/vo/pulso/.tokens-estado.json"
TZ = dt.timezone(dt.timedelta(hours=-5))  # Cancún, sin horario de verano
SECRETO = re.compile(r"(sk-[A-Za-z0-9_-]{8,}|csk-[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{12,}|postgres(ql)?://\S+|Bearer\s+\S+|eyJ[A-Za-z0-9_-]{20,})")


def limpio(t, n):
    t = SECRETO.sub("***", str(t or "")).replace("\n", " ").strip()
    return t[:n]


def env():
    d = {}
    try:
        for l in open("/root/.env"):
            m = re.match(r"^(?:export\s+)?([A-Z0-9_]+)=(.*)$", l.strip())
            if m:
                d[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    except OSError:
        pass
    return d


def hoy_local(ts=None):
    return dt.datetime.fromtimestamp(ts if ts is not None else time.time(), TZ)


def iso_a_ts(s):
    try:
        return dt.datetime.fromisoformat(str(s).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


# ── Cola ───────────────────────────────────────────────────────────────────
def titulo_de(prompt):
    p = str(prompt or "")
    m = re.search(r"^EL PEDIDO DE LUIS\n(.+)$", p, re.M)
    if m:
        return "Encargo de V: " + m.group(1)
    for linea in p.splitlines():
        l = linea.strip().lstrip("#*-> ").strip()
        if len(l) >= 6 and not l.upper().startswith(("VIVO PROYECTO", "ENCARGO V", "REPOSITORIO", "RAMA DE TRABAJO", "VFORGE RUN")):
            return l
    return "trabajo sin título"


def cola(url):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    cn = psycopg2.connect(url, cursor_factory=RealDictCursor, connect_timeout=8)
    cur = cn.cursor()
    cur.execute("""
      SELECT id, agent, status, COALESCE(NULLIF(project_id,''), NULLIF(gajo,''), source) AS proyecto,
             LEFT(prompt, 1500) AS prompt, progress_pct, log_tail, source,
             EXTRACT(EPOCH FROM started_at) AS inicio, EXTRACT(EPOCH FROM created_at) AS creado
        FROM dispatch_queue
       WHERE status IN ('running','pending')
         AND COALESCE(started_at, created_at) > now() - interval '6 hours'
       ORDER BY CASE WHEN status='running' THEN 0 ELSE 1 END, COALESCE(started_at, created_at) DESC
       LIMIT 20""")
    activos = cur.fetchall()
    cur.execute("""
      SELECT id, agent, status, COALESCE(NULLIF(project_id,''), NULLIF(gajo,''), source) AS proyecto,
             LEFT(prompt, 1500) AS prompt, EXTRACT(EPOCH FROM completed_at) AS fin,
             EXTRACT(EPOCH FROM started_at) AS inicio, LEFT(error, 200) AS error
        FROM dispatch_queue
       WHERE status IN ('done','failed','error') AND completed_at > now() - interval '30 minutes'
       ORDER BY completed_at DESC LIMIT 8""")
    cerrados = cur.fetchall()
    cn.close()

    def base(r):
        return {"id": r["id"], "agente": (r["agent"] or "").replace("-encargo", ""),
                "proyecto": limpio(r["proyecto"], 60) or None, "titulo": limpio(titulo_de(r["prompt"]), 110)}

    trabajos = []
    for r in activos:
        t = base(r)
        ult = [l for l in str(r["log_tail"] or "").splitlines() if l.strip()]
        t.update({"estado": "trabajando" if r["status"] == "running" else "en cola",
                  "avance": int(r["progress_pct"]) if r["progress_pct"] else None,
                  "rastro": limpio(ult[-1], 140) if ult else None,
                  "desde": int(r["inicio"] or r["creado"] or 0) or None})
        # Un "running" de más de 90 min sin moverse es un zombi: no se pinta como vivo.
        if t["estado"] == "trabajando" and t["desde"] and time.time() - t["desde"] > 5400:
            continue
        trabajos.append(t)
    terminados = []
    for r in cerrados:
        t = base(r)
        t.update({"estado": "terminado" if r["status"] == "done" else "falló", "fin": int(r["fin"] or 0) or None,
                  "duracion": int((r["fin"] or 0) - (r["inicio"] or 0)) if r["inicio"] and r["fin"] else None,
                  "error": limpio(r["error"], 160) if r["status"] != "done" else None})
        terminados.append(t)
    return trabajos, terminados


# ── Procesos de agentes fuera de la cola ───────────────────────────────────
def arranque_proceso(pid):
    try:
        campos = open(f"/proc/{pid}/stat").read().rsplit(")", 1)[1].split()
        ticks = int(campos[19])
        hz = os.sysconf("SC_CLK_TCK")
        uptime = float(open("/proc/uptime").read().split()[0])
        return time.time() - (uptime - ticks / hz)
    except Exception:
        return None


def proyecto_de_carpeta(cwd):
    m = re.match(r"^/tmp/vforge-(claude|codex)-(\d+)", cwd)
    if m:
        return "vforge", int(m.group(2))
    m = re.match(r"^/root/worktrees/([^/]+)", cwd)
    if m:
        return m.group(1).replace("vivo-", ""), None
    m = re.match(r"^/tmp/worktree-([^/]+)", cwd)
    if m:
        return m.group(1), None
    return os.path.basename(cwd.rstrip("/")) or "servidor", None


MI_NS = os.readlink("/proc/self/ns/mnt")


def procesos():
    vistos = {}
    for d in glob.glob("/proc/[0-9]*"):
        pid = int(d.rsplit("/", 1)[1])
        try:
            arg = open(f"{d}/cmdline", "rb").read().split(b"\0")
            arg = [a.decode("utf-8", "replace") for a in arg if a]
            cwd = os.readlink(f"{d}/cwd")
        except Exception:
            continue
        if not arg:
            continue
        nombres = [os.path.basename(a) for a in arg[:3]]
        if "claude" in nombres and "-p" in arg:
            motor = "claude"
        elif any(n in ("codex", "codex.js") for n in nombres) and "exec" in arg:
            motor = "codex"
        else:
            continue
        clave = (motor, cwd)
        ini = arranque_proceso(pid)
        # claude/codex lanzan hijos con la misma línea: nos quedamos con el más viejo
        if clave not in vistos or (ini and ini < (vistos[clave]["desde"] or 1e12)):
            proy, job = proyecto_de_carpeta(cwd)
            prompt = None
            if "-p" in arg:
                i = arg.index("-p")
                if i + 1 < len(arg) and not arg[i + 1].startswith("-"):
                    prompt = arg[i + 1]
            try:
                encerrado = os.readlink(f"{d}/ns/mnt") != MI_NS
            except OSError:
                encerrado = None
            vistos[clave] = {"motor": motor, "proyecto": proy, "job": job, "encerrado": encerrado,
                             "titulo": limpio(titulo_de(prompt), 110) if prompt else None,
                             "desde": int(ini) if ini else None}
    return sorted(vistos.values(), key=lambda x: x["desde"] or 0)


# ── Motor vivo ─────────────────────────────────────────────────────────────
def vivo():
    try:
        with urllib.request.urlopen("http://127.0.0.1:9311/__vivo/health", timeout=3) as r:
            d = json.loads(r.read())
        return [{"slot": s["id"], "proyecto": s["proyecto"], "listo": s["listo"], "ocioso_seg": s.get("ociosoSeg")}
                for s in d.get("slots", []) if s.get("vivo")]
    except Exception:
        return None


# ── Tokens de hoy (lectura incremental de bitácoras) ───────────────────────
def cargar_estado():
    try:
        return json.load(open(ESTADO))
    except Exception:
        return {}


def sumar(est, dia, hora, motor, entrada=0, cache=0, salida=0):
    d = est.setdefault("dias", {}).setdefault(dia, {})
    m = d.setdefault(motor, {"entrada": 0, "cache": 0, "salida": 0, "horas": [0] * 24})
    m["entrada"] += entrada
    m["cache"] += cache
    m["salida"] += salida
    m["horas"][hora] += entrada + cache + salida


def leer_nuevo(est, ruta):
    """Devuelve las líneas nuevas desde la última lectura (por offset)."""
    of = est.setdefault("offsets", {})
    try:
        tam = os.path.getsize(ruta)
    except OSError:
        return []
    ini = of.get(ruta, 0)
    if tam < ini:
        ini = 0
    if tam == ini:
        return []
    with open(ruta, "rb") as f:
        f.seek(ini)
        datos = f.read(tam - ini)
    corte = datos.rfind(b"\n")
    if corte < 0:
        return []
    of[ruta] = ini + corte + 1
    return datos[:corte].decode("utf-8", "replace").splitlines()


def tokens(est):
    ahora = time.time()
    # Claude Code (todas las sesiones del servidor: daemon, jaula, agentes)
    for base in ("/root/.claude/projects", "/root/.claude-turbillon/projects", "/home/vagent/.claude/projects"):
        for ruta in glob.glob(base + "/**/*.jsonl", recursive=True):
            try:
                if ahora - os.path.getmtime(ruta) > 36 * 3600 and ruta not in est.get("offsets", {}):
                    continue
            except OSError:
                continue
            ultimo = est.setdefault("ultimo_msg", {}).get(ruta)
            for linea in leer_nuevo(est, ruta):
                if '"usage"' not in linea:
                    continue
                try:
                    ev = json.loads(linea)
                    msg = ev.get("message") or {}
                    u = msg.get("usage") or {}
                    mid = msg.get("id")
                except Exception:
                    continue
                if not u or (mid and mid == ultimo):
                    continue  # el mismo mensaje se repite por bloque de contenido
                ultimo = mid
                ts = iso_a_ts(ev.get("timestamp")) or ahora
                lt = hoy_local(ts)
                sumar(est, lt.strftime("%Y-%m-%d"), lt.hour, "claude",
                      entrada=int(u.get("input_tokens") or 0) + int(u.get("cache_creation_input_tokens") or 0),
                      cache=int(u.get("cache_read_input_tokens") or 0),
                      salida=int(u.get("output_tokens") or 0))
            est["ultimo_msg"][ruta] = ultimo
    # Codex (sesiones de ChatGPT Pro): cada token_count trae el uso de esa vuelta
    lim = None
    for dia in {hoy_local(ahora - 86400 * k).astimezone(dt.timezone.utc).strftime("%Y/%m/%d") for k in (0, 1)} | {
            dt.datetime.now(dt.timezone.utc).strftime("%Y/%m/%d")}:
        for ruta in glob.glob(f"/root/.codex/sessions/{dia}/*.jsonl"):
            for linea in leer_nuevo(est, ruta):
                if '"token_count"' not in linea:
                    continue
                try:
                    ev = json.loads(linea)
                    info = (ev.get("payload") or {}).get("info") or {}
                    u = info.get("last_token_usage") or {}
                    rl = ((ev.get("payload") or {}).get("rate_limits") or {}).get("primary") or {}
                except Exception:
                    continue
                ts = iso_a_ts(ev.get("timestamp")) or ahora
                if rl.get("used_percent") is not None and ts >= (est.get("codex_limite") or {}).get("t", 0):
                    est["codex_limite"] = {"usado_pct": rl.get("used_percent"), "ventana_min": rl.get("window_minutes"),
                                           "reinicia": rl.get("resets_at"), "t": int(ts)}
                if not u:
                    continue
                lt = hoy_local(ts)
                cache = int(u.get("cached_input_tokens") or 0)
                sumar(est, lt.strftime("%Y-%m-%d"), lt.hour, "codex",
                      entrada=max(0, int(u.get("input_tokens") or 0) - cache), cache=cache,
                      salida=int(u.get("output_tokens") or 0))
    # Cerebras vía mesh: el router anota los tokens de salida de cada llamada
    for linea in leer_nuevo(est, "/root/mesh-router/usage.jsonl"):
        try:
            r = json.loads(linea)
        except Exception:
            continue
        if not r.get("capa", "").startswith("cerebras"):
            continue
        lt = hoy_local(r.get("ts") or ahora)
        sumar(est, lt.strftime("%Y-%m-%d"), lt.hour, "cerebras", salida=int(r.get("toks") or 0))
        est.setdefault("cerebras_llamadas", {}).setdefault(lt.strftime("%Y-%m-%d"), 0)
        est["cerebras_llamadas"][lt.strftime("%Y-%m-%d")] += 1
    # solo se guardan 3 días
    dias = sorted(est.get("dias", {}))
    for viejo in dias[:-3]:
        est["dias"].pop(viejo, None)
    for k in sorted(est.get("cerebras_llamadas", {}))[:-3]:
        est["cerebras_llamadas"].pop(k, None)
    hoy = hoy_local().strftime("%Y-%m-%d")
    d = est.get("dias", {}).get(hoy, {})
    return {"dia": hoy, "claude": d.get("claude"), "codex": d.get("codex"), "cerebras": d.get("cerebras"),
            "cerebras_llamadas": est.get("cerebras_llamadas", {}).get(hoy, 0)}


def main():
    t0 = time.time()
    E = env()
    salida = {"generado": int(time.time())}
    try:
        salida["trabajos"], salida["terminados"] = cola(E.get("NEON_DATABASE_URL_API", ""))
    except Exception as e:
        salida["trabajos"], salida["terminados"] = None, None
        salida["error_cola"] = type(e).__name__
    try:
        salida["procesos"] = procesos()
    except Exception as e:
        salida["procesos"] = None
        salida["error_procesos"] = type(e).__name__
    salida["vivo"] = vivo()
    est = cargar_estado()
    try:
        salida["tokens"] = tokens(est)
    except Exception as e:
        salida["tokens"] = None
        salida["error_tokens"] = type(e).__name__
    salida["codex_limite"] = est.get("codex_limite")
    tmp = ESTADO + ".tmp"
    with open(tmp, "w") as f:
        json.dump(est, f)
    os.replace(tmp, ESTADO)
    salida["colector_ms"] = int((time.time() - t0) * 1000)
    tmp = OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(salida, f, ensure_ascii=False)
    os.replace(tmp, OUT)
    os.chmod(OUT, 0o644)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Tablero Vulcano: foto del trabajo de agentes en el servidor.

Imprime JSON compacto a stdout y lo guarda en /root/tablero/estado.json.
Solo lee: no toca worktrees, crons ni procesos.
"""
import json, os, re, subprocess, time, glob, datetime as dt
from collections import Counter

WT = "/root/worktrees"
PROJ = "/root/.claude/projects"
OUT = "/root/tablero/estado.json"
NOW = time.time()
DAY = 86400


def sh(cmd, cwd=None, t=15):
    try:
        return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True,
                              text=True, timeout=t).stdout.strip()
    except Exception:
        return ""


def iso(ts):
    return dt.datetime.utcfromtimestamp(ts).strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None


# ---------- procesos claude vivos (cwd real vía /proc) ----------
vivos = []
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    try:
        cmd = open(f"/proc/{pid}/cmdline", "rb").read().split(b"\0")
        if not cmd or not cmd[0].endswith(b"claude"):
            continue
        if b"-p" not in cmd:
            continue
        cwd = os.readlink(f"/proc/{pid}/cwd")
        start = os.stat(f"/proc/{pid}").st_mtime
        vivos.append({"pid": int(pid), "cwd": cwd, "desde": iso(start),
                      "min": round((NOW - start) / 60)})
    except Exception:
        pass

# ---------- crons que lanzan agentes ----------
cron = sh("crontab -l 2>/dev/null")
loops = {}  # worktree -> script
cron_agentes = []
for line in cron.splitlines():
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    m = re.search(r"(/root/[\w./-]+\.sh)", s)
    if not m:
        continue
    script = m.group(1)
    try:
        body = open(script).read()
    except Exception:
        continue
    if not re.search(r"\bclaude\s+(-p|--print)\b", body):
        continue  # solo scripts que lanzan sesiones de Claude Code
    sched = " ".join(s.split()[:5])
    wt = re.search(r"cd\s+(/root/worktrees/[\w.-]+)", body)
    tope = bool(re.search(r"seq\s+1\s+\d+|MAX_|max_intentos", body))
    done = re.search(r"-f\s+(DONE[\w-]*)", body)
    tag = re.search(r'date\s+\+"\[([\w-]+)\]', body)
    entry = {"script": script, "cada": sched, "worktree": wt.group(1) if wt else None,
             "con_tope": tope, "marca_fin": done.group(1) if done else None,
             "etiqueta": tag.group(1) if tag else None}
    cron_agentes.append(entry)
    if wt:
        loops[wt.group(1)] = entry

# ---------- sesiones por día y por proyecto ----------
por_dia = Counter()
por_proy_24 = Counter()
por_proy_7 = Counter()
ultima_proy = {}
for f in glob.glob(PROJ + "/*/*.jsonl"):
    try:
        mt = os.path.getmtime(f)
    except Exception:
        continue
    if NOW - mt > 7 * DAY:
        continue
    proy = os.path.basename(os.path.dirname(f))
    por_dia[dt.datetime.utcfromtimestamp(mt - 5 * 3600).strftime("%Y-%m-%d")] += 1  # hora Cancún
    por_proy_7[proy] += 1
    if NOW - mt <= DAY:
        por_proy_24[proy] += 1
    ultima_proy[proy] = max(ultima_proy.get(proy, 0), mt)

dias = []
for i in range(6, -1, -1):
    d = dt.datetime.utcfromtimestamp(NOW - 5 * 3600 - i * DAY).strftime("%Y-%m-%d")
    dias.append({"dia": d, "sesiones": por_dia.get(d, 0)})


def proy_key(path):
    return path.replace("/", "-")


# ---------- MUST-500 ----------
def must500(path):
    j = os.path.join(path, "qa/m8/must500.json")
    if not os.path.exists(j):
        return None
    res = {"conteo": {}, "resumen": None, "fallas": []}
    try:
        items = json.load(open(j))
        c = Counter()
        for it in items:
            e = str(it.get("estado", "?")).strip()
            c[e] += 1
            if e == "❌" and len(res["fallas"]) < 12:
                res["fallas"].append({"n": it.get("n"),
                                      "ev": (it.get("evidencia") or "")[:160]})
        res["conteo"] = dict(c)
        res["registrados"] = len(items)
    except Exception as e:
        res["error"] = str(e)[:100]
    # la línea oficial de estado la escribe el propio agente en sus commits
    pat = r"MUST-500\s*(\d+)\s*[·•]\s*✅\s*(\d+)\s*[·•]\s*❌\s*(\d+)\s*[·•]\s*MANUAL\s*(\d+)\s*[·•]\s*LUIS\s*(\d+)\s*[·•]\s*⏳\s*(\d+)"
    tail = sh("tail -c 60000 BRIEF-M8.md.log", cwd=path)
    hits = list(re.finditer(pat, tail))
    m = hits[-1] if hits else re.search(pat, sh("git log -40 --format=%s", cwd=path))
    if m:
        t, ok, mal, man, luis, pend = map(int, m.groups())
        res["resumen"] = {"total": t, "ok": ok, "mal": mal, "manual": man,
                          "luis": luis, "pendiente": pend}
    return res


# ---------- frentes (worktrees) ----------
frentes = []
for path in sorted(glob.glob(WT + "/*/")):
    path = path.rstrip("/")
    name = os.path.basename(path)
    if not os.path.isdir(os.path.join(path, ".git")) and not os.path.isfile(os.path.join(path, ".git")):
        continue
    key = proy_key(path)
    s24 = sum(v for k, v in por_proy_24.items() if k.startswith(key))
    s7 = sum(v for k, v in por_proy_7.items() if k.startswith(key))
    ult = max([v for k, v in ultima_proy.items() if k.startswith(key)] or [0])
    commits24 = sh("git log --since='24 hours ago' --oneline | wc -l", cwd=path)
    ultimos = sh("git log -5 --format='%ct\x1f%s'", cwd=path)
    lista = []
    for l in ultimos.splitlines():
        if "\x1f" in l:
            ts, msg = l.split("\x1f", 1)
            lista.append({"cuando": iso(int(ts)), "msg": msg[:140]})
    ult_commit = lista[0]["cuando"] if lista else None
    if NOW - max(ult, 0) > 7 * DAY and not (path in loops):
        continue  # frente dormido: fuera del tablero
    briefs = sorted(glob.glob(path + "/BRIEF-*.md"), key=os.path.getmtime, reverse=True)
    titulo = None
    if briefs:
        try:
            titulo = open(briefs[0]).readline().lstrip("# ").strip()[:140]
        except Exception:
            pass
    dones = [os.path.basename(p) for p in glob.glob(path + "/DONE*")]
    loop = loops.get(path)
    intentos = None
    ult_intento = None
    sup = os.path.join(path, "supervisor.log")
    if os.path.exists(sup):
        L = open(sup, errors="ignore").read().splitlines()
        tagp = "[%s]" % loop["etiqueta"] if loop and loop.get("etiqueta") else "["
        inten = [l for l in L if l.startswith(tagp)]
        intentos = len(inten)
        ult_intento = inten[-1][:60] if inten else None
    corriendo = [v for v in vivos if v["cwd"].startswith(path)]
    if corriendo:
        estado = "trabajando"
    elif loop and not (loop["marca_fin"] and loop["marca_fin"] in dones):
        estado = "en loop"
    elif loop and loop["marca_fin"] in dones:
        estado = "terminado"
    elif NOW - max(ult, 0) < DAY:
        estado = "reciente"
    else:
        estado = "quieto"
    frentes.append({
        "nombre": name, "estado": estado, "brief": titulo,
        "sesiones_24h": s24, "sesiones_7d": s7, "ultima_sesion": iso(ult) if ult else None,
        "commits_24h": int(commits24 or 0), "ultimo_commit": ult_commit, "commits": lista,
        "loop": loop, "intentos": intentos, "ultimo_intento": ult_intento,
        "fin": dones, "corriendo": corriendo, "must500": must500(path),
    })

orden = {"trabajando": 0, "en loop": 1, "reciente": 2, "terminado": 3, "quieto": 4}
frentes.sort(key=lambda f: (orden.get(f["estado"], 9), -f["sesiones_24h"]))

fuera = []  # sesiones fuera de worktrees (repos sueltos, /root, /tmp)
for k, v in por_proy_24.most_common():
    if not k.startswith(proy_key(WT)) and "/subagents" not in k:
        fuera.append({"donde": k.lstrip("-").replace("-", "/")[:80], "sesiones_24h": v})

estado = {
    "generado": iso(NOW),
    "sesiones_por_dia": dias,
    "sesiones_24h": sum(por_proy_24.values()),
    "claude_vivos": vivos,
    "crons_agentes": cron_agentes,
    "frentes": frentes,
    "fuera_de_worktrees": fuera[:8],
}
txt = json.dumps(estado, ensure_ascii=False, separators=(",", ":"))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w").write(txt)
print(txt)

#!/usr/bin/env python3
"""Tablero Vulcano: la foto de la fábrica, medida — nunca estimada.

Qué hace: recorre los frentes de trabajo del Hetzner (worktrees + crons `sup-*`
+ servicios `agente-*`), les saca avance real de su `LISTA-*.md`, suma los tokens
que se comió la cuenta de Claude leyendo los `.jsonl` de `/root/.claude/projects`,
y mide la salud del servidor. Escribe todo a `estado.json`.

Reglas que NO se rompen:
  - Solo LEE. Ningún worktree, cron ni proceso se toca desde aquí.
  - Si un dato no se puede medir, sale `null` + el motivo. Cero inventos:
    un frente sin `LISTA-*.md` no tiene porcentaje, tiene una explicación.

Fuente: repo turbillon50/vforge, `servidor/tablero/estado.py`.
Se instala con `servidor/tablero/instalar.sh` (ver README.md). No editar la
copia instalada en /usr/local/sbin: el instalador la sobrescribe.
"""
import datetime as dt
import glob
import json
import os
import re
import subprocess
import time
from collections import Counter, defaultdict

WT = "/root/worktrees"
PROJ = "/root/.claude/projects"
DATA = os.environ.get("VL_TABLERO_DATA", "/root/tablero")
OUT = os.path.join(DATA, "estado.json")
CACHE = os.path.join(DATA, "tokens-cache.json")
BITACORA = os.path.join(DATA, "control.log")
PAUSA_GLOBAL = "/root/.claude-limite-hasta"
SUPERVISOR = "vl-supervisor"
MAX_DIA = int(os.environ.get("VL_MAX_DIA", "10"))
NOW = time.time()
DAY = 86400
TZ_OFF = -5 * 3600  # Cancún: todo lo que Luis lee está en su hora


def sh(cmd, cwd=None, t=15):
    try:
        return subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True,
                              text=True, timeout=t).stdout.strip()
    except Exception:
        return ""


def iso(ts):
    if not ts:
        return None
    return dt.datetime.fromtimestamp(ts, dt.timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ")


def dia_local(ts):
    return dt.datetime.fromtimestamp(ts + TZ_OFF, dt.timezone.utc).strftime(
        "%Y-%m-%d")


def desde_iso(s):
    return dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=dt.timezone.utc).timestamp()


def leer(path, n=None):
    try:
        with open(path, errors="ignore") as fh:
            return fh.read(n) if n else fh.read()
    except Exception:
        return ""


# ───────────────────────── procesos claude vivos ─────────────────────────
# cwd real vía /proc: es el único dato que amarra un proceso a su worktree.
vivos = []
for pid in os.listdir("/proc"):
    if not pid.isdigit():
        continue
    try:
        cmd = open(f"/proc/{pid}/cmdline", "rb").read().split(b"\0")
        if not cmd or not cmd[0].endswith(b"claude") or b"-p" not in cmd:
            continue
        cwd = os.readlink(f"/proc/{pid}/cwd")
        start = os.stat(f"/proc/{pid}").st_mtime
        vivos.append({"pid": int(pid), "cwd": cwd, "desde": iso(start),
                      "min": round((NOW - start) / 60)})
    except Exception:
        pass

# ───────────────────── pausa global por límite de cuenta ─────────────────────
limite = None
if os.path.exists(PAUSA_GLOBAL):
    try:
        hasta = int(leer(PAUSA_GLOBAL).strip() or 0)
        if hasta > NOW:
            limite = {"hasta": iso(hasta), "min": round((hasta - NOW) / 60)}
    except Exception:
        pass


# ───────────────── lanzadores: quién arranca agentes y con qué freno ─────────
# Un lanzador es un cron `sup-*.sh` o un servicio `agente-*`. De ahí salen el
# tag, el worktree, el brief y el modelo — los cuatro datos que definen un frente.
RE_SUP = re.compile(r"vl-supervisor\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?")
RE_MODELO = re.compile(r"^(opus|sonnet|haiku|claude-[\w.-]+)$", re.I)


def parse_supervisor(texto, cwd=None):
    """Saca tag/worktree/brief/modelo de una invocación de vl-supervisor.

    Sirve igual para un `sup-*.sh` (línea pelona) que para un ExecStart de
    systemd, que viene envuelto en `{ path=... ; argv[]=... ; ignore_errors=... }`
    — de ahí hay que cortar en el ` ;` o el modelo sale valiendo ";".
    """
    argv = re.search(r"argv\[\]=(.*?)(?:\s;|\}|$)", texto, re.S)
    if argv:
        texto = argv.group(1)
    m = RE_SUP.search(texto)
    if not m:
        return None
    tag, wt, brief, modelo = m.group(1), m.group(2), m.group(3), m.group(4)
    if not brief.startswith("/"):
        brief = os.path.join(cwd or wt, brief)
    return {"tag": tag, "worktree": wt.rstrip("/"), "brief": brief,
            "modelo": modelo if modelo and RE_MODELO.match(modelo)
            else "por defecto"}


lanzadores = []

# crons
cron_txt = sh("crontab -l 2>/dev/null")
for linea in cron_txt.splitlines():
    s = linea.strip()
    if not s or s.startswith("#"):
        continue
    m = re.search(r"(/root/[\w./-]+\.sh)", s)
    if not m:
        continue
    script = m.group(1)
    cuerpo = leer(script)
    if not re.search(r"\bclaude\s+(-p|--print)\b|vl-supervisor", cuerpo):
        continue  # no lanza sesiones de Claude Code: no es un frente
    sup = parse_supervisor(cuerpo)
    wt = sup["worktree"] if sup else None
    if not wt:
        w = re.search(r"cd\s+(/root/worktrees/[\w.-]+)", cuerpo)
        wt = w.group(1) if w else None
    lanzadores.append({
        "tipo": "cron", "ref": script, "cada": " ".join(s.split()[:5]),
        "activo": True, "supervisado": bool(sup),
        "tag": sup["tag"] if sup else os.path.basename(script)[4:-3],
        "worktree": wt, "brief": sup["brief"] if sup else None,
        "modelo": sup["modelo"] if sup else None,
    })

# servicios systemd
for unidad in sh("systemctl list-units 'agente-*' --all --no-legend --plain "
                 "| awk '{print $1}'").split():
    if not unidad.endswith(".service"):
        continue
    ejec = sh(f"systemctl show {unidad} -p ExecStart --value")
    estado_u = sh(f"systemctl show {unidad} -p ActiveState --value")
    sup = parse_supervisor(ejec)
    lanzadores.append({
        "tipo": "servicio", "ref": unidad, "cada": "siempre encendido",
        "activo": estado_u == "active", "supervisado": bool(sup),
        "tag": sup["tag"] if sup else unidad[7:-8],
        "worktree": sup["worktree"] if sup else None,
        "brief": sup["brief"] if sup else None,
        "modelo": sup["modelo"] if sup else None,
        "systemd": estado_u,
    })


# ─────────────────────── avance real desde la LISTA-*.md ────────────────────
RE_PUNTO = re.compile(r"^\s*[-*]\s*\[([ xX~])\]\s*(.*)$")
RE_TITULO = re.compile(r"^#{1,3}\s+(.*)$")


def avance(path, tag, con_tag):
    """Porcentaje = `[x]` / total de puntos de la lista. Sin lista: None + motivo.

    La lista TIENE que ser la del frente (`LISTA-<tag>.md`). Los worktrees se
    clonan entre sí y arrastran la `LISTA-` de otro agente: medir con esa da un
    porcentaje que no es de este frente. Antes que inventar, se dice que no hay.
    """
    listas = sorted(glob.glob(os.path.join(path, "LISTA-*.md")))
    if not listas:
        return {"pct": None, "motivo": "sin lista: no se puede medir avance"}
    propia = [l for l in listas
              if os.path.basename(l).upper() == f"LISTA-{tag}.MD".upper()]
    if propia:
        archivo = propia[0]
    elif con_tag:
        ajenas = ", ".join(os.path.basename(l) for l in listas[:3])
        return {"pct": None,
                "motivo": f"sin LISTA-{tag}.md: no se puede medir avance "
                          f"(las que hay — {ajenas} — son de otro frente)"}
    elif len(listas) == 1:
        archivo = listas[0]
    else:
        return {"pct": None,
                "motivo": f"{len(listas)} listas y ningún frente declarado: "
                          "no se sabe cuál mide este trabajo"}
    hechos = total = 0
    bloque = None          # el `## ...` donde vive el primer punto sin marcar
    bloque_actual = None
    pendiente = None
    for linea in leer(archivo).splitlines():
        t = RE_TITULO.match(linea)
        if t:
            bloque = t.group(1).strip()
            continue
        p = RE_PUNTO.match(linea)
        if not p:
            continue
        total += 1
        if p.group(1).lower() == "x":
            hechos += 1
        elif pendiente is None:
            pendiente = re.sub(r"[*_`]", "", p.group(2)).strip()[:120]
            bloque_actual = bloque
    if total == 0:
        return {"pct": None, "archivo": os.path.basename(archivo),
                "motivo": "la lista existe pero no tiene puntos `- [ ]`"}
    return {
        "pct": round(hechos * 100 / total),
        "hechos": hechos, "total": total,
        "archivo": os.path.basename(archivo),
        "bloque_actual": bloque_actual or ("todo listo" if not pendiente else None),
        "pendiente": pendiente,
        "propia": bool(propia),
    }


# ─────────────────────── tokens de la cuenta de Claude ──────────────────────
# Los .jsonl pesan >1 GB: se parsean una vez y se guarda el resumen por archivo
# (offset + último id). En cada corrida solo se lee lo nuevo.
# Un mismo `message.id` aparece repetido (parciales del streaming): se cuenta una vez.

def escanear_tokens():
    try:
        cache = json.load(open(CACHE))
    except Exception:
        cache = {}
    dias_validos = {dia_local(NOW - i * DAY) for i in range(8)}
    por_proy = defaultdict(lambda: defaultdict(
        lambda: {"entrada": 0, "salida": 0, "cache_nuevo": 0, "cache_leido": 0,
                 "mensajes": 0}))
    modelos = Counter()
    nuevo = {}
    for f in glob.glob(PROJ + "/*/*.jsonl"):
        try:
            st = os.stat(f)
        except Exception:
            continue
        ent = cache.get(f)
        if ent and ent.get("size", 0) > st.st_size:
            ent = None  # el archivo se truncó: se relee entero
        off = ent["off"] if ent else 0
        dias = dict(ent["dias"]) if ent else {}
        mods = Counter(ent.get("modelos", {})) if ent else Counter()
        ultimo_id = ent.get("last_id") if ent else None
        if st.st_size > off:
            try:
                with open(f, "rb") as fh:
                    fh.seek(off)
                    resto = fh.read()
                    consumido = off + resto.rfind(b"\n") + 1  # solo líneas cerradas
                    for linea in resto.split(b"\n"):
                        if b'"usage"' not in linea:
                            continue
                        try:
                            o = json.loads(linea)
                        except Exception:
                            continue
                        msg = o.get("message") or {}
                        u = msg.get("usage")
                        if not isinstance(u, dict):
                            continue
                        mid = msg.get("id")
                        if mid and mid == ultimo_id:
                            continue  # parcial repetido del mismo mensaje
                        ultimo_id = mid
                        ts = o.get("timestamp")
                        try:
                            seg = dt.datetime.strptime(
                                ts[:19], "%Y-%m-%dT%H:%M:%S").replace(
                                tzinfo=dt.timezone.utc).timestamp()
                        except Exception:
                            seg = st.st_mtime
                        d = dia_local(seg)
                        a = dias.setdefault(d, [0, 0, 0, 0, 0])
                        a[0] += u.get("input_tokens") or 0
                        a[1] += u.get("output_tokens") or 0
                        a[2] += u.get("cache_creation_input_tokens") or 0
                        a[3] += u.get("cache_read_input_tokens") or 0
                        a[4] += 1
                        if msg.get("model"):
                            mods[msg["model"]] += 1
                    off = max(off, consumido)
            except Exception:
                pass
        nuevo[f] = {"off": off, "size": st.st_size, "dias": dias,
                    "last_id": ultimo_id, "modelos": dict(mods)}
        proy = os.path.basename(os.path.dirname(f))
        for d, a in dias.items():
            if d not in dias_validos:
                continue
            t = por_proy[proy][d]
            t["entrada"] += a[0]
            t["salida"] += a[1]
            t["cache_nuevo"] += a[2]
            t["cache_leido"] += a[3]
            t["mensajes"] += a[4]
        modelos.update(mods)
    try:
        os.makedirs(DATA, exist_ok=True)
        json.dump(nuevo, open(CACHE + ".tmp", "w"))
        os.replace(CACHE + ".tmp", CACHE)
    except Exception:
        pass
    return por_proy, modelos


tokens_proy, tokens_modelos = escanear_tokens()


def ruta_de_proy(clave):
    """`-root-worktrees-vforge-b2` → `/root/worktrees/vforge-b2`.

    Los guiones son ambiguos (separan carpetas y también van dentro del nombre),
    así que se resuelve contra el disco: en cada nivel gana el tramo más largo
    que exista. Lo que ya no existe (worktree borrado por el barrido) conserva
    sus guiones en vez de partirse mal.
    """
    partes = clave.lstrip("-").split("-")
    ruta, i = "", 0
    while i < len(partes):
        for j in range(len(partes), i, -1):
            cand = ruta + "/" + "-".join(partes[i:j])
            if os.path.isdir(cand):
                ruta, i = cand, j
                break
        else:
            return ruta + "/" + "-".join(partes[i:])
    return ruta


def tokens_de(path):
    """Suma los tokens de todas las carpetas de sesión que cuelgan de un worktree."""
    key = path.replace("/", "-")
    out = defaultdict(lambda: {"entrada": 0, "salida": 0, "cache_nuevo": 0,
                               "cache_leido": 0, "mensajes": 0})
    for proy, dias in tokens_proy.items():
        if proy != key and not proy.startswith(key + "-"):
            continue
        for d, t in dias.items():
            for k, v in t.items():
                out[d][k] += v
    return dict(out)


def suma(dias, desde=None):
    tot = {"entrada": 0, "salida": 0, "cache_nuevo": 0, "cache_leido": 0,
           "mensajes": 0}
    for d, t in dias.items():
        if desde and d < desde:
            continue
        for k in tot:
            tot[k] += t.get(k, 0)
    tot["total"] = (tot["entrada"] + tot["salida"] + tot["cache_nuevo"]
                    + tot["cache_leido"])
    return tot


# ──────────────────────────────── frentes ───────────────────────────────────
por_wt = {}
for l in lanzadores:
    if l["worktree"]:
        por_wt.setdefault(l["worktree"], []).append(l)

rutas = {p.rstrip("/") for p in glob.glob(WT + "/*/")
         if os.path.exists(os.path.join(p, ".git"))}
rutas |= {w for w in por_wt if os.path.isdir(w)}

dias_semana = [dia_local(NOW - i * DAY) for i in range(6, -1, -1)]
hoy = dias_semana[-1]

frentes = []
for path in sorted(rutas):
    nombre = os.path.basename(path)
    lanz = por_wt.get(path, [])
    activo_l = [l for l in lanz if l["activo"]] or lanz
    tag = activo_l[0]["tag"] if activo_l else nombre

    marcas = {os.path.basename(p) for p in glob.glob(path + "/DONE-*")
              + glob.glob(path + "/STALLED-*") + glob.glob(path + "/PAUSA-*")}
    corriendo = [v for v in vivos if v["cwd"] == path
                 or v["cwd"].startswith(path + "/")]
    tk = tokens_de(path)
    tk_hoy = suma(tk, hoy)
    tk_7 = suma(tk, dias_semana[0])

    # ── estado: lo que manda es lo que se ve en el piso, no lo que dice el cron
    nota = None
    if corriendo:
        estado = "trabajando"
    elif f"DONE-{tag}" in marcas:
        estado = "terminado"
    elif any(m.startswith("STALLED-") for m in marcas):
        estado = "atorado"
        nota = leer(os.path.join(path, f"STALLED-{tag}"), 200).strip() or None
    elif any(m.startswith("PAUSA-") for m in marcas):
        estado = "pausado"
        nota = leer(os.path.join(path, f"PAUSA-{tag}"), 200).strip() or None
    elif limite and activo_l:
        estado = "pausado por límite"
        nota = f"la cuenta topó; se reanuda solo en {limite['min']} min"
    elif activo_l:
        estado = "en espera"
    else:
        estado = "quieto"

    # sin freno = alguien lo relanza pero no a través de vl-supervisor
    sueltos = [l for l in activo_l if not l["supervisado"]]
    sin_freno = bool(sueltos)

    # brief: el que declara el lanzador; si no, el BRIEF-*.md más reciente
    brief_path = next((l["brief"] for l in activo_l if l.get("brief")), None)
    if not brief_path or not os.path.exists(brief_path):
        cands = sorted(glob.glob(path + f"/BRIEF-{tag}.md")
                       or glob.glob(path + "/BRIEF-*.md"),
                       key=os.path.getmtime, reverse=True)
        brief_path = cands[0] if cands else None
    titulo = None
    if brief_path and os.path.exists(brief_path):
        titulo = leer(brief_path, 400).splitlines()[0].lstrip("# ").strip()[:160] or None

    # corridas de hoy y tope
    corridas = None
    cnt = leer(f"/root/.sup-{tag}.dia").split()
    if len(cnt) == 2 and cnt[0] == hoy:
        corridas = int(cnt[1])
    elif len(cnt) == 2:
        corridas = 0

    commits = []
    for l in sh("git log -5 --format='%ct\x1f%s'", cwd=path).splitlines():
        if "\x1f" in l:
            ts, msg = l.split("\x1f", 1)
            commits.append({"cuando": iso(int(ts)), "msg": msg[:160]})
    rama = sh("git rev-parse --abbrev-ref HEAD", cwd=path) or None
    proyecto = os.path.basename(
        sh("git config --get remote.origin.url", cwd=path)
        .rstrip("/").removesuffix(".git")) or nombre

    ult_sup = None
    log = leer(os.path.join(path, "supervisor.log"))
    if log:
        lineas = [x for x in log.splitlines() if x.startswith(f"[{tag}]")]
        ult_sup = lineas[-1][:120] if lineas else None

    # Un frente sin lanzador, sin proceso y sin actividad en 7 días es inventario
    # viejo: no se pinta para no ahogar el tablero.
    ult_commit = commits[0]["cuando"] if commits else None
    quieto_viejo = (not lanz and not corriendo and tk_7["total"] == 0
                    and (not ult_commit or NOW - desde_iso(ult_commit) > 7 * DAY))
    if quieto_viejo:
        continue

    frentes.append({
        "tag": tag,
        "nombre": nombre,
        "worktree": path,
        "proyecto": proyecto,
        "rama": rama,
        "brief": titulo,
        "brief_archivo": brief_path,
        "modelo": next((l["modelo"] for l in activo_l if l.get("modelo")), None),
        "estado": estado,
        "nota": nota,
        "sin_freno": sin_freno,
        "supervisado": bool(activo_l) and not sin_freno,
        "avance": avance(path, tag, bool(lanz)),
        "corridas_hoy": corridas,
        "tope_dia": MAX_DIA if activo_l else None,
        "min_trabajando": corriendo[0]["min"] if corriendo else None,
        "corriendo": corriendo,
        "commits": commits,
        "ultimo_commit": ult_commit,
        "lanzadores": [{k: l[k] for k in
                        ("tipo", "ref", "cada", "activo", "supervisado")}
                       for l in lanz],
        "ultimo_supervisor": ult_sup,
        "marcas": sorted(marcas),
        "tokens_hoy": tk_hoy,
        "tokens_7d": tk_7,
        "tokens_por_dia": [{"dia": d, **tk.get(d, {})} for d in dias_semana],
    })

ORDEN = {"trabajando": 0, "atorado": 1, "pausado por límite": 2, "pausado": 3,
         "en espera": 4, "terminado": 5, "quieto": 6}
frentes.sort(key=lambda f: (ORDEN.get(f["estado"], 9),
                            -f["tokens_hoy"]["total"]))

# ───────────────────── consumo: por día y quién se come la semana ───────────
consumo_dia = []
for d in dias_semana:
    t = {"dia": d, "entrada": 0, "salida": 0, "cache_nuevo": 0,
         "cache_leido": 0, "mensajes": 0}
    for dias in tokens_proy.values():
        for k in ("entrada", "salida", "cache_nuevo", "cache_leido", "mensajes"):
            t[k] += dias.get(d, {}).get(k, 0)
    t["total"] = t["entrada"] + t["salida"] + t["cache_nuevo"] + t["cache_leido"]
    consumo_dia.append(t)

# lo que no cae en ningún worktree (chats, repos sueltos) también gasta la cuenta
vistos = set()
for f in frentes:
    key = f["worktree"].replace("/", "-")
    vistos |= {p for p in tokens_proy if p == key or p.startswith(key + "-")}
fuera = []
for proy, dias in tokens_proy.items():
    if proy in vistos:
        continue
    t = suma(dias, dias_semana[0])
    if t["total"]:
        fuera.append({"donde": ruta_de_proy(proy)[:70], "tokens_7d": t})
fuera.sort(key=lambda x: -x["tokens_7d"]["total"])

ranking = sorted(
    [{"tag": f["tag"], "nombre": f["nombre"], "tokens_7d": f["tokens_7d"]["total"],
      "tokens_hoy": f["tokens_hoy"]["total"]} for f in frentes],
    key=lambda x: -x["tokens_7d"])
total_7d = sum(d["total"] for d in consumo_dia)
for r in ranking:
    r["pct_semana"] = round(r["tokens_7d"] * 100 / total_7d, 1) if total_7d else 0

# ──────────────────────────── salud del servidor ────────────────────────────
disco = {}
d = sh("df -B1 --output=size,used,avail,pcent / | tail -1").split()
if len(d) == 4:
    disco = {"total": int(d[0]), "usado": int(d[1]), "libre": int(d[2]),
             "pct": int(d[3].rstrip("%")),
             "libre_gb": round(int(d[2]) / 1e9, 1)}
    disco["alerta"] = disco["libre"] < 5e9

mem = {}
for linea in sh("free -b").splitlines():
    c = linea.split()
    if c and c[0] == "Mem:":
        mem["ram"] = {"total": int(c[1]), "usado": int(c[2]), "libre": int(c[-1]),
                      "pct": round(int(c[2]) * 100 / int(c[1]))}
    if c and c[0] == "Swap:" and int(c[1]) > 0:
        mem["swap"] = {"total": int(c[1]), "usado": int(c[2]),
                       "pct": round(int(c[2]) * 100 / int(c[1]))}

caidos = []
for linea in sh("systemctl --failed --no-legend --plain").splitlines():
    c = linea.split()
    if c:
        caidos.append({"unidad": c[0],
                       "detalle": " ".join(c[4:])[:100] if len(c) > 4 else ""})

barrido = sh("curl -s --max-time 8 https://estado.vforge.site/barrido.txt")
carga = leer("/proc/loadavg").split()[:3]

salud = {
    "disco": disco,
    "memoria": mem,
    "carga": [float(x) for x in carga] if len(carga) == 3 else None,
    "servicios_caidos": caidos,
    "claude_vivos": len(vivos),
    "crons_supervisor": [
        {"ref": l["ref"], "cada": l["cada"], "tag": l["tag"],
         "supervisado": l["supervisado"], "activo": l["activo"]}
        for l in lanzadores],
    "barrido": barrido[:800] or None,
    "limite_cuenta": limite,
}

# ─────────────────────────── bitácora de controles ──────────────────────────
bitacora = []
for linea in leer(BITACORA).splitlines()[-40:][::-1]:
    try:
        bitacora.append(json.loads(linea))
    except Exception:
        if linea.strip():
            bitacora.append({"crudo": linea[:200]})

# ─────────────────────────────── alertas ────────────────────────────────────
alertas = []
if limite:
    alertas.append({"nivel": "alto", "clave": "limite",
                    "titulo": "La cuenta de Claude topó su límite",
                    "detalle": f"Todos los frentes están en pausa hasta {limite['hasta']} "
                               f"({limite['min']} min)."})
if disco.get("alerta"):
    alertas.append({"nivel": "alto", "clave": "disco",
                    "titulo": f"Quedan {disco['libre_gb']} GB de disco",
                    "detalle": "Por debajo de 5 GB. Corre el barrido o limpia node_modules."})
for f in frentes:
    if f["estado"] == "atorado":
        alertas.append({"nivel": "alto", "clave": f"atorado:{f['tag']}",
                        "titulo": f"{f['tag']} está atorado",
                        "detalle": f["nota"] or "3 corridas seguidas sin commit."})
    if f["sin_freno"]:
        refs = ", ".join(l["ref"] for l in f["lanzadores"] if not l["supervisado"])
        alertas.append({"nivel": "medio", "clave": f"sinfreno:{f['tag']}",
                        "titulo": f"{f['tag']} corre sin freno",
                        "detalle": f"{refs} relanza Claude Code sin vl-supervisor: "
                                   "sin tope diario ni pausa por límite de cuenta."})
    if f["corridas_hoy"] and f["tope_dia"] and f["corridas_hoy"] >= f["tope_dia"]:
        alertas.append({"nivel": "medio", "clave": f"tope:{f['tag']}",
                        "titulo": f"{f['tag']} agotó sus {f['tope_dia']} corridas de hoy",
                        "detalle": "No volverá a arrancar hasta mañana."})
for s in caidos:
    alertas.append({"nivel": "medio", "clave": f"caido:{s['unidad']}",
                    "titulo": f"Servicio caído: {s['unidad']}",
                    "detalle": s["detalle"] or "systemctl --failed lo reporta."})

estado = {
    "generado": iso(NOW),
    "version": 2,
    "alertas": alertas,
    "frentes": frentes,
    "consumo": {
        "por_dia": consumo_dia,
        "ranking": ranking,
        "fuera_de_frentes": fuera[:8],
        "modelos": tokens_modelos.most_common(6),
        "total_7d": total_7d,
        "total_hoy": consumo_dia[-1]["total"] if consumo_dia else 0,
    },
    "salud": salud,
    "bitacora": bitacora,
}

txt = json.dumps(estado, ensure_ascii=False, separators=(",", ":"))
os.makedirs(DATA, exist_ok=True)
with open(OUT + ".tmp", "w") as fh:
    fh.write(txt)
os.replace(OUT + ".tmp", OUT)
print(txt)

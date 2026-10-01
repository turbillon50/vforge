"""Parche del daemon: encargos de V, ENCERRADOS (versión amarrada aprobada por Luis 30-sep).

- No toca run_claude ni run_codex: los encargos van por su propio ejecutor.
- El agente corre dentro de /opt/vf-vivo/jaula.sh: solo ve el worktree del proyecto,
  sin /root, sin secretos, sin docker, sin capacidades de root, .git de solo lectura.
- Claude sin bypass: solo Read/Edit/Write/Glob/Grep + git diff/status + tsc. Sin shell
  libre, sin web. Codex queda fuera de los encargos hasta tener su propia jaula.
- El daemon (afuera) hace el commit con hooks desactivados y guarda el aprendizaje.
"""
import shutil, time
RUTA = "/root/agents/vulcano_daemon.py"
src = open(RUTA).read()
if "_vivo_workspace" in src:
    raise SystemExit("ya parchado")
shutil.copy(RUTA, f"/root/fase0/respaldos/vulcano_daemon.py.antes-encargos-{int(time.time())}")

HELPERS = r'''
# ── ENCARGOS DE V (30-sep-2026, versión amarrada) ───────────────────────────
# Un encargo trae la línea "VIVO PROYECTO <nombre>". La ruta del worktree sale
# del registro del motor vivo, nunca del prompt. El agente corre ENCERRADO
# (jaula.sh) y sin permisos de más. Al cerrar, el daemon hace el commit en la
# rama de trabajo y guarda lo aprendido en v_encargos y en el Brain.
_VIVO_REGISTRO = "/opt/vf-vivo/proyectos.json"
_JAULA = "/opt/vf-vivo/jaula.sh"
_ENCARGO_SI = ["Read", "Edit", "Write", "Glob", "Grep",
               "Bash(git diff:*)", "Bash(git status:*)", "Bash(npx tsc:*)"]
_ENCARGO_NO = ["WebFetch", "WebSearch", "Task", "Read(//proc/**)", "Read(//tmp/hogar/**)",
               "Read(**/.env*)", "Edit(**/.env*)", "Write(**/.env*)"]
_vivo_locks = {}
_vivo_locks_guard = threading.Lock()


def _vivo_nombre(prompt):
    m = re.search(r"^VIVO PROYECTO\s+([a-z0-9][a-z0-9-]{1,62})\s*$", prompt or "", re.M)
    return m.group(1) if m else None


def _vivo_workspace(prompt):
    nombre = _vivo_nombre(prompt)
    if not nombre:
        return None
    try:
        reg = json.load(open(_VIVO_REGISTRO)).get("proyectos", {})
    except Exception as ex:
        raise RuntimeError("encargo V: no pude leer el registro del motor vivo: %s" % ex)
    conf = reg.get(nombre)
    if not conf:
        raise RuntimeError("encargo V: el proyecto %s no está en el motor vivo" % nombre)
    wt = os.path.realpath(conf.get("worktree") or "")
    if not wt.startswith("/root/worktrees/vivo-") or not os.path.isdir(os.path.join(wt, ".git")):
        raise RuntimeError("encargo V: worktree inválido para %s" % nombre)
    return wt


def _vivo_lock(nombre):
    with _vivo_locks_guard:
        if nombre not in _vivo_locks:
            _vivo_locks[nombre] = threading.Lock()
        return _vivo_locks[nombre]


def _encargo_num(prompt):
    m = re.search(r"^ENCARGO V #(\d+)\s*$", prompt or "", re.M)
    return int(m.group(1)) if m else None


def _token_claude_encargo():
    try:
        for linea in open("/root/.claude/oauth_token.env"):
            linea = linea.strip()
            if "CLAUDE_CODE_OAUTH_TOKEN=" in linea:
                return linea.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


def run_encargo(prompt, agente):
    """Claude ENCERRADO en el worktree vivo. Devuelve su respuesta final."""
    import subprocess as _s, time as _t, json as _j
    if agente != "claude":
        raise RuntimeError("encargo V: %s todavía no tiene jaula; los encargos van con claude" % agente)
    wt = _vivo_workspace(prompt)
    token = _token_claude_encargo()
    if not token:
        raise RuntimeError("encargo V: falta el token de Claude para la jaula")
    task_id = _current_task_id()
    env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "CLAUDE_CODE_OAUTH_TOKEN": token,
        "DISABLE_AUTOUPDATER": "1",
        "JAULA_VARS": "CLAUDE_CODE_OAUTH_TOKEN DISABLE_AUTOUPDATER",
    }
    cmd = ([_JAULA, wt, "claude", "-p", "--output-format", "stream-json", "--verbose",
            "--permission-mode", "acceptEdits", "--max-turns", "80", "--allowedTools"]
           + _ENCARGO_SI + ["--disallowedTools"] + _ENCARGO_NO)
    proc = _s.Popen(cmd, stdin=_s.PIPE, stdout=_s.PIPE, stderr=_s.PIPE, text=True, env=env, bufsize=1)
    proc.stdin.write(prompt)
    proc.stdin.close()
    limite = _t.time() + _current_timeout()
    turnos, final, rastro, ultimo = 0, None, [], 0.0
    for linea in proc.stdout:
        try:
            ev = _j.loads(linea)
        except Exception:
            continue
        if ev.get("type") == "assistant":
            turnos += 1
            for b in (ev.get("message") or {}).get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    inp = b.get("input") or {}
                    rastro.append("%s %s" % (b.get("name"), inp.get("file_path") or inp.get("command") or inp.get("pattern") or ""))
                    rastro = rastro[-5:]
        elif ev.get("type") == "result":
            final = ev.get("result") or ""
        if task_id and _t.time() - ultimo > 12:
            ultimo = _t.time()
            _update_task(task_id, {"progress_pct": min(95, 5 + turnos * 2), "log_tail": "\n".join(rastro)})
        if _t.time() > limite:
            proc.kill()
            raise _s.TimeoutExpired("claude-encargo", _current_timeout())
    proc.wait(timeout=30)
    if final is None:
        err = (proc.stderr.read() or "")[-600:]
        raise RuntimeError("encargo V: claude terminó sin resultado (exit %s) %s" % (proc.returncode, err))
    return final


def _encargo_campos(texto):
    t = str(texto or "")
    i = t.rfind("=== APRENDIZAJE ===")
    if i < 0:
        return {}
    bloque = t[i:]
    j = bloque.find("=== FIN ===")
    if j > 0:
        bloque = bloque[:j]
    patron = re.compile(r"^\s*[-*]?\s*\**(PEDIDO|HICE|REVISI[OÓ]N|MAL|CORRECCI[OÓ]N|LECCI[OÓ]N)\**\s*:\s*(.*)$", re.M | re.I)
    marcas = list(patron.finditer(bloque))
    campos = {}
    for k, m in enumerate(marcas):
        fin = marcas[k + 1].start() if k + 1 < len(marcas) else len(bloque)
        clave = m.group(1).upper().replace("Ó", "O")
        campos[clave] = (m.group(2) + bloque[m.end():fin]).strip()[:1500]
    return campos


def _encargo_cerrar(prompt, task_id, resultado=None, error=None):
    """Guarda el cambio (commit, sin hooks) y lo aprendido. Nunca tumba el job."""
    import subprocess as _s
    nombre = _vivo_nombre(prompt)
    num = _encargo_num(prompt)
    if not nombre or not num:
        return
    sha, archivos = None, []
    try:
        wt = _vivo_workspace(prompt)
        g = ["git", "-C", wt, "-c", "core.hooksPath=/dev/null"]
        est = _s.run(g + ["status", "--porcelain"], capture_output=True, text=True, timeout=30)
        archivos = [l[3:].strip() for l in est.stdout.splitlines() if len(l) > 3]
        if archivos:
            pedido = re.search(r"^EL PEDIDO DE LUIS\n(.+)$", prompt, re.M)
            asunto = (pedido.group(1) if pedido else "cambio")[:70].replace("\n", " ")
            autor = ["-c", "user.name=turbillon50", "-c", "user.email=turbillon50@gmail.com"]
            _s.run(g + ["add", "-A"], capture_output=True, timeout=60)
            c = _s.run(g + autor + ["commit", "-q", "-m", "[estudio-vivo] encargo V #%s: %s" % (num, asunto)],
                       capture_output=True, text=True, timeout=60)
            if c.returncode == 0:
                sha = _s.run(g + ["rev-parse", "--short", "HEAD"],
                             capture_output=True, text=True, timeout=15).stdout.strip() or None
    except Exception as ex:
        log.warning("[encargo V #%s] commit: %s" % (num, ex))

    campos = _encargo_campos(resultado) if resultado else {}
    if error:
        estado = "fallo"
    elif not archivos:
        estado = "sin_cambios"
    elif not campos:
        estado = "sin_revision"
    else:
        estado = "listo"
    try:
        cn = psycopg2.connect(DB_URL)
        cn.autocommit = True
        with cn.cursor() as cc:
            cc.execute(
                """UPDATE v_encargos SET estado=%s, cerrado=now(), hice=%s, revision=%s, mal=%s,
                          correccion=%s, leccion=%s, commit_sha=%s, archivos=%s::jsonb, error=%s
                    WHERE id=%s""",
                (estado, campos.get("HICE"), campos.get("REVISION"), campos.get("MAL"),
                 campos.get("CORRECCION"), campos.get("LECCION"), sha,
                 json.dumps(archivos[:40]), (str(error)[:800] if error else None), num))
        cn.close()
    except Exception as ex:
        log.warning("[encargo V #%s] v_encargos: %s" % (num, ex))

    resumen = ("Encargo V #%s en %s (%s, job %s, %s). HICE: %s | MAL: %s | CORRECCION: %s | LECCION: %s%s"
               % (num, nombre, estado, task_id, sha or "sin commit", campos.get("HICE", "-")[:300],
                  campos.get("MAL", "-")[:300], campos.get("CORRECCION", "-")[:300],
                  campos.get("LECCION", "-")[:300], (" | ERROR: " + str(error)[:200]) if error else ""))
    store_memory(agent="V", mtype="aprendizaje", topic="encargo:" + nombre, content=resumen, importance=6)
    log.info("[encargo V #%s] %s %s" % (num, estado, sha or ""))


def _ejecutar(executor, prompt, task_id, final_si_falla, agente="claude"):
    """Si es encargo de V: encerrado, uno a la vez por proyecto y con cierre. Si no, igual que antes."""
    nombre = _vivo_nombre(prompt)
    if not nombre:
        return executor(prompt)
    agente = (agente or "claude").replace("-encargo", "")
    with _vivo_lock(nombre):
        try:
            resultado = run_encargo(prompt, agente)
        except subprocess.TimeoutExpired:
            _encargo_cerrar(prompt, task_id, error="timeout tras %ss" % _current_timeout())
            raise
        except Exception as e:
            if final_si_falla:
                _encargo_cerrar(prompt, task_id, error=e)
            raise
        _encargo_cerrar(prompt, task_id, resultado=resultado)
        return resultado

'''

ancla = "def run_claude(prompt: str) -> str:"
assert src.count(ancla) == 1
src = src.replace(ancla, HELPERS + "\n" + ancla, 1)

c = "        result = executor(prompt)\n    except subprocess.TimeoutExpired as te:"
assert src.count(c) == 1
src = src.replace(c, "        result = _ejecutar(executor, prompt, task_id, retries >= MAX_RETRY, task_type)\n    except subprocess.TimeoutExpired as te:", 1)

# Los encargos entran como agent "claude-encargo" (claude_loop.py sólo toma agent='claude').
e = "\nVALID_AGENTS = set(EXECUTORS.keys())"
assert src.count(e) == 1
src = src.replace(e, '\nEXECUTORS["claude-encargo"] = lambda p: run_encargo(p, "claude")' + e, 1)

open(RUTA, "w").write(src)
print("ok")

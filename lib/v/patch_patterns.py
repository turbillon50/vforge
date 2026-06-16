#!/usr/bin/env python3
# Parche determinista: V aprende patrones de razonamiento despues de cada sesion.
# - _v_extract_pattern(session_id): al cerrar turnos (>5), extrae patron y lo sella en public.patterns
# - _v_apply_patterns(context): antes de responder, inyecta "sabiduria acumulada" al system prompt
# - _v_maybe_extract(session_id): dispara extraccion en background con cadencia
import sys, py_compile, shutil, os

F = "/home/brain-relay.py"
src = open(F, encoding="utf-8").read()
orig = src

NEW_FUNCS = r'''
# ════════════════════════════════════════════════════════════════════════════
# V APRENDE PATRONES — sabiduria acumulada de razonamiento
# Luis: "Entre mas ideas, mas crecemos. Invierto en infraestructura, no en estructura."
# V de hoy > V de ayer porque acumulo patrones, no solo lecciones puntuales.
# ════════════════════════════════════════════════════════════════════════════
import hashlib as _hl_pat, threading as _thr_pat

_PAT_STOP = set((
    "para con por los las del una unos unas que como mas pero este esta esto "
    "the and for you have with from your dale carnal hermano hola gracias oye "
    "quiero necesito puedes hacer todo bien listo ahora aqui esto eso"
).split())

def _v_pat_keywords(text, n=8):
    import re as _re
    words = _re.findall(r"[a-zA-Z0-9_.\-]{4,}", (text or "").lower())
    out = []
    for w in words:
        if w in _PAT_STOP or w in out:
            continue
        out.append(w)
        if len(out) >= n:
            break
    return out

def _v_apply_patterns(context):
    """Antes de responder: busca patrones relevantes al contexto y los inyecta como
    SABIDURIA ACUMULADA en el system prompt. Sube times_used de los que aplica.
    Lee public.patterns (schema completo: weight/wins/fingerprint)."""
    try:
        kws = _v_pat_keywords(context, 8)
        rows = []
        if kws:
            conds = " OR ".join(
                ("(title ILIKE ${i} OR problem ILIKE ${i} OR fix ILIKE ${i} OR "
                 "array_to_string(tags,' ') ILIKE ${i} OR "
                 "array_to_string(applies_to,' ') ILIKE ${i})").replace("{i}", str(i + 1))
                for i in range(len(kws)))
            params = ["%" + k + "%" for k in kws]
            q = ("SELECT id,title,fix,weight,times_used FROM public.patterns "
                 "WHERE archived IS NOT TRUE AND (" + conds + ") "
                 "ORDER BY weight DESC, times_used DESC LIMIT 4")
            rows = _brain_sql(q, params).get("rows", [])
        if not rows:
            rows = _brain_sql(
                "SELECT id,title,fix,weight,times_used FROM public.patterns "
                "WHERE archived IS NOT TRUE ORDER BY weight DESC, times_used DESC LIMIT 2"
            ).get("rows", [])
        if not rows:
            return ""
        ids = ",".join(str(int(r["id"])) for r in rows)
        try:
            _brain_sql("UPDATE public.patterns SET times_used=COALESCE(times_used,0)+1, "
                       "last_used_at=now() WHERE id IN (" + ids + ")")
        except Exception:
            pass
        lines = ["\n\nSABIDURIA ACUMULADA (patrones que ya te funcionaron antes — aplicalos cuando encajen):"]
        for r in rows:
            fix = str(r.get("fix") or "").replace("\n", " ")[:170]
            lines.append("  - " + str(r.get("title", "?")) + ": " + fix)
        return "\n".join(lines)
    except Exception as ex:
        logging.warning("[V] apply_patterns: " + str(ex)[:160])
        return ""

def _v_extract_pattern(session_id):
    """Al cerrar una sesion con >5 turnos: V analiza la conversacion, extrae UN patron
    de razonamiento reutilizable (que problema, que enfoque funciono, efectividad) y lo
    sella en public.patterns. Si el fingerprint ya existe => sube weight (3+ => dominante)."""
    import psycopg2, json as _j, re as _re
    try:
        conn = psycopg2.connect(VFORGE_CONN, connect_timeout=6)
        cur = conn.cursor()
        cur.execute(
            "SELECT role, LEFT(content,800) FROM conversations "
            "WHERE session_id=%s AND role IN ('user','assistant') "
            "AND length(content)>3 AND content NOT LIKE '%%Load failed%%' "
            "ORDER BY created_at ASC", (session_id,))
        turns = cur.fetchall()
        conn.close()
    except Exception as ex:
        logging.warning("[V] extract read: " + str(ex)[:160])
        return None
    if len(turns) <= 5:
        return None
    transcript = "\n".join(
        ("Luis: " if r == "user" else "V: ") + (c or "") for r, c in turns)[:6000]
    sys_p = (
        "Eres un analista. Lee esta conversacion de trabajo entre Luis y su agente V. "
        "Extrae UN patron de razonamiento REUTILIZABLE (un metodo que funciono), no una "
        "leccion puntual ni un dato. Responde SOLO un objeto JSON valido, sin markdown ni texto extra:\n"
        '{"worth_saving":true|false,"area":"<2-3 palabras>","title":"<frase corta accionable>",'
        '"problem":"<que se resolvia>","approach":"<el enfoque concreto que funciono>",'
        '"tags":["t1","t2"],"effectiveness":0.0}\n'
        "worth_saving=false si fue charla trivial, saludo, o sin enfoque tecnico claro. "
        "effectiveness entre 0 y 1 segun que tan bien resolvio.")
    raw = _v_llm_super([
        {"role": "system", "content": sys_p},
        {"role": "user", "content": transcript},
    ]) or ""
    m = _re.search(r"\{[\s\S]*\}", raw)
    if not m:
        return None
    try:
        d = _j.loads(m.group(0))
    except Exception:
        return None
    if not d.get("worth_saving") or not str(d.get("title", "")).strip():
        return None
    area = str(d.get("area", "")).strip()[:60]
    title = str(d.get("title", "")).strip()[:200]
    problem = str(d.get("problem", "")).strip()[:500]
    approach = str(d.get("approach", "")).strip()[:600]
    tags = [str(t)[:40] for t in (d.get("tags") or []) if str(t).strip()][:6]
    try:
        eff = max(0.0, min(1.0, float(d.get("effectiveness", 0.7))))
    except Exception:
        eff = 0.7
    fp = _hl_pat.sha256((area + "|" + title).lower().encode("utf-8")).hexdigest()[:32]
    try:
        ex_rows = _brain_sql(
            "SELECT id,times_used,weight FROM public.patterns WHERE fingerprint=$1",
            [fp]).get("rows", [])
    except Exception:
        ex_rows = []
    if ex_rows:
        pid = ex_rows[0]["id"]
        _brain_sql(
            "UPDATE public.patterns SET times_used=COALESCE(times_used,0)+1, "
            "wins=COALESCE(wins,0)+1, weight=LEAST(COALESCE(weight,1.0)+0.25, 3.0), "
            "last_used_at=now() WHERE id=$1", [pid])
        logging.info("[V] patron REFORZADO #%s: %s" % (pid, title[:60]))
        return {"action": "reinforced", "id": pid, "title": title, "fingerprint": fp}
    base_w = round(1.0 + eff, 3)
    _brain_sql(
        "INSERT INTO public.patterns "
        "(title,problem,cause,fix,applies_to,tags,times_used,weight,wins,losses,source,fingerprint) "
        "VALUES ($1,$2,$3,$4,$5,$6,1,$7,1,0,'post_session',$8)",
        [title, problem, "", approach, ([area] if area else []), tags, base_w, fp])
    # Espejo compacto en brain.patterns (lo que el boot context de V ya muestra)
    try:
        ex2 = _brain_sql("SELECT id FROM brain.patterns WHERE title=$1", [title]).get("rows", [])
        if not ex2:
            _brain_sql(
                "INSERT INTO brain.patterns (title,problem,cause,fix,applies_to,tags,times_used) "
                "VALUES ($1,$2,$3,$4,$5,$6,1)",
                [title, problem, "", approach, ([area] if area else []), tags])
    except Exception:
        pass
    logging.info("[V] patron NUEVO: %s (w=%s)" % (title[:60], base_w))
    return {"action": "created", "title": title, "fingerprint": fp, "weight": base_w}

def _v_maybe_extract(session_id):
    """Hot-path zero-cost: dispara en background. Cadencia: extrae cada ~6 turnos nuevos
    por sesion (marcador en vulcano_memory) para no spamear ni reanalizar lo mismo."""
    def _bg():
        try:
            import psycopg2
            topic = "pat_extract:" + str(session_id)
            last = _brain_sql(
                "SELECT content FROM vulcano_memory WHERE topic=$1 "
                "ORDER BY created_at DESC LIMIT 1", [topic]).get("rows", [])
            conn = psycopg2.connect(VFORGE_CONN, connect_timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM conversations WHERE session_id=%s "
                        "AND role IN ('user','assistant')", (session_id,))
            n = cur.fetchone()[0]
            conn.close()
            if n <= 5:
                return
            last_n = 0
            if last and str(last[0]["content"]).strip().isdigit():
                last_n = int(last[0]["content"])
            if n - last_n < 6:
                return
            _brain_sql("INSERT INTO vulcano_memory (content,topic) VALUES ($1,$2)",
                       [str(n), topic])
            _v_extract_pattern(session_id)
        except Exception as ex:
            logging.warning("[V] maybe_extract: " + str(ex)[:160])
    try:
        _thr_pat.Thread(target=_bg, daemon=True).start()
    except Exception as ex:
        logging.warning("[V] maybe_extract spawn: " + str(ex)[:160])
# ════════════════════════════════════════════════════════════════════════════

'''

def must_replace(s, old, new, count):
    n = s.count(old)
    assert n == count, "esperaba %d ocurrencias, hay %d de: %r" % (count, n, old[:70])
    return s.replace(old, new)

# 1) Insertar las funciones nuevas justo antes de app.run(...)
RUN_ANCHOR = "app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 9000)), use_reloader=False, threaded=True)"
src = must_replace(src, RUN_ANCHOR, NEW_FUNCS + RUN_ANCHOR, 1)

# 2) chat-full + stream-chat: inyectar apply_patterns en el system prompt (2 ocurrencias)
src = must_replace(
    src,
    '    messages = [{"role": "system", "content": system}]',
    '    system += _v_apply_patterns(user_msg)\n    messages = [{"role": "system", "content": system}]',
    2)

# 3) chat-full + stream-chat: disparar extraccion en background (2 ocurrencias)
src = must_replace(
    src,
    "    db_context = _v_build_db_context(session_id, user_msg)",
    "    db_context = _v_build_db_context(session_id, user_msg)\n    _v_maybe_extract(session_id)",
    2)

# 4) v_chat legacy: apply + extract antes del messages inline (1 ocurrencia unica)
LEGACY_OLD = (
    '    messages = [\n'
    '        {"role": "system", "content": system},\n'
    '        {"role": "user",   "content": user_msg}\n'
    '    ]')
LEGACY_NEW = (
    '    system += _v_apply_patterns(user_msg)\n'
    '    _v_maybe_extract(session_id)\n'
    '    messages = [\n'
    '        {"role": "system", "content": system},\n'
    '        {"role": "user",   "content": user_msg}\n'
    '    ]')
src = must_replace(src, LEGACY_OLD, LEGACY_NEW, 1)

# Backup + escribir + compilar
bak = F + ".bak_patterns"
if not os.path.exists(bak):
    shutil.copy2(F, bak)
open(F, "w", encoding="utf-8").write(src)
py_compile.compile(F, doraise=True)
print("OK parche aplicado. bytes %d -> %d. backup: %s" % (len(orig), len(src), bak))

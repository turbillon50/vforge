#!/usr/bin/env python3
# Demo: ejecuta _v_extract_pattern (la funcion real recien implementada) sobre 5
# sesiones reales con >5 turnos. Carga brain-relay.py como modulo neutralizando app.run.
import re, json, traceback

src = open("/home/brain-relay.py", encoding="utf-8").read()
# Neutralizar el arranque del servidor y el broadcaster WS (no queremos bloquear).
src = src.replace(
    "app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 9000)), use_reloader=False, threaded=True)",
    "pass  # app.run neutralizado para demo")
src = src.replace("_ws_threading.Thread(target=_ws_broadcaster, daemon=True).start()",
                  "pass  # broadcaster neutralizado")

g = {"__name__": "brain_relay_demo"}
exec(compile(src, "/home/brain-relay.py", "exec"), g)

extract = g["_v_extract_pattern"]

SESSIONS = [
    "s_general_mou6kc61r86a4d",
    "s_general_mqd6ztd0qsb4zk",
    "s_general_mq1veewin6xsh5",
    "s_moqcbqbj_x5n3f9",
    "s_general_mq09pftcwmyszd",
]

print("=== EXTRACCION DE PATRONES SOBRE SESIONES REALES ===", flush=True)
for sid in SESSIONS:
    try:
        r = extract(sid)
        print("\n[" + sid + "] -> " + json.dumps(r, ensure_ascii=False), flush=True)
    except Exception:
        print("\n[" + sid + "] ERROR:\n" + traceback.format_exc(), flush=True)

print("\n=== TOP PATRONES post_session EN public.patterns ===", flush=True)
bs = g["_brain_sql"]
rows = bs("SELECT id,title,LEFT(fix,90) fix,weight,times_used,array_to_string(tags,',') tags,source "
          "FROM public.patterns WHERE source='post_session' ORDER BY id DESC LIMIT 10").get("rows", [])
for r in rows:
    print(json.dumps(r, ensure_ascii=False), flush=True)
print("=== FIN ===", flush=True)

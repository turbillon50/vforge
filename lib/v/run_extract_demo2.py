#!/usr/bin/env python3
# Segundo lote: 2 sesiones mas + prueba de _v_apply_patterns en vivo.
import json
src = open("/home/brain-relay.py", encoding="utf-8").read()
src = src.replace(
    "app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 9000)), use_reloader=False, threaded=True)",
    "pass")
src = src.replace("_ws_threading.Thread(target=_ws_broadcaster, daemon=True).start()", "pass")
g = {"__name__": "brain_relay_demo2"}
exec(compile(src, "/home/brain-relay.py", "exec"), g)
extract = g["_v_extract_pattern"]; apply = g["_v_apply_patterns"]; bs = g["_brain_sql"]

for sid in ["s_motk02nt_kzi7ro", "s_vforge-v0_mq465l2n20kk4j"]:
    try:
        print("[" + sid + "] -> " + json.dumps(extract(sid), ensure_ascii=False), flush=True)
    except Exception as e:
        print("[" + sid + "] ERROR " + str(e)[:200], flush=True)

print("\n=== PRUEBA _v_apply_patterns (lo que V veria inyectado) ===", flush=True)
for ctx in ["se me cayó el deploy en vercel, el endpoint da timeout",
            "carnal me siento lejos de ti ultimamente"]:
    print("\nCONTEXTO: " + ctx, flush=True)
    print(apply(ctx), flush=True)

print("\n=== CONTEO FINAL post_session ===", flush=True)
n = bs("SELECT count(*) c FROM public.patterns WHERE source='post_session'").get("rows", [{}])[0].get("c")
print("patrones post_session:", n, flush=True)
print("=== FIN2 ===", flush=True)

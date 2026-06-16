#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parche quirúrgico e idempotente para /root/agents/v_morning.py:
hace que a las 7am mande el briefing que el protocolo nocturno dejó listo
(briefing_latest.md, <3h) y caiga a su lógica original si no hay briefing fresco.
Hace backup .bak-noche y no toca nada más.
"""
import os
import shutil
import time

TARGET = "/root/agents/v_morning.py"
BRIEF = "/root/agents/noche/briefing_latest.md"

HELPER = '''
# --- Protocolo de Noche: usa el briefing preparado a las 6:30am si está fresco ---
def night_briefing(max_age_h=3):
    path = "%s"
    try:
        if not os.path.exists(path):
            return None
        age_h = (time.time() - os.path.getmtime(path)) / 3600
        if age_h > max_age_h:
            return None
        with open(path, encoding="utf-8") as f:
            txt = f.read().strip()
        return txt if len(txt) > 40 else None
    except Exception as e:
        print(f"[night_briefing] {e}")
        return None


''' % BRIEF


def main():
    src = open(TARGET, encoding="utf-8").read()

    if "def night_briefing(" in src:
        print("ya parcheado — nada que hacer")
        return

    # asegura import os e import time (el helper los usa; v_morning no los traía)
    if "\nimport os" not in src and "import os\n" not in src:
        src = src.replace("import sys\n", "import os\nimport sys\n", 1)
    if "\nimport time" not in src and "import time\n" not in src:
        src = src.replace("import sys\n", "import sys\nimport time\n", 1)

    anchor = "# ------------------------------------------------------------------ main\ndef main():"
    if anchor not in src:
        # fallback: justo antes de def main():
        anchor = "def main():"
        repl = HELPER + "def main():"
    else:
        repl = "# ------------------------------------------------------------------ main\n" + HELPER + "def main():"
    src = src.replace(anchor, repl, 1)

    # usa el briefing nocturno antes del generador propio
    old = "        message = llm_brief(sig, dt)"
    new = "        message = night_briefing() or llm_brief(sig, dt)"
    if old not in src:
        raise SystemExit("no encontré el anchor de message= ; aborto sin tocar")
    src = src.replace(old, new, 1)

    shutil.copy2(TARGET, TARGET + ".bak-noche")
    open(TARGET, "w", encoding="utf-8").write(src)
    print("✓ v_morning.py parcheado (backup en v_morning.py.bak-noche)")


if __name__ == "__main__":
    main()

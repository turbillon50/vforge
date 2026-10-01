#!/usr/bin/env python3
"""copia-neon.py — da a un proyecto del motor vivo su COPIA de base de datos.

Crea (o reusa) la rama "sala-vivo" de Neon del proyecto, con un rol propio
`sala_vivo` que SOLO existe en esa rama, y escribe DATABASE_URL en el
.env.local del worktree vivo (permiso 600, fuera de git).
Así la Sala corre con datos reales sin copiar las llaves de producción y sin
que lo que se haga en la Sala toque la base real.

Uso: python3 copia-neon.py <nombre-vivo> <neon-project-id>
"""
import json
import os
import re
import sys
import time
import urllib.request

REGISTRO = "/opt/vf-vivo/proyectos.json"


def env():
    d = {}
    for linea in open("/root/.env"):
        m = re.match(r"^(?:export\s+)?([A-Z0-9_]+)=(.*)$", linea.strip())
        if m:
            d[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return d


def main():
    nombre, proyecto = sys.argv[1], sys.argv[2]
    conf = json.load(open(REGISTRO))["proyectos"][nombre]
    wt = conf["worktree"]
    llave = env()["NEON_API_KEY"]

    def api(metodo, ruta, cuerpo=None):
        req = urllib.request.Request(
            "https://console.neon.tech/api/v2" + ruta, method=metodo,
            data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
            headers={"Authorization": "Bearer " + llave, "Content-Type": "application/json", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())

    ramas = api("GET", f"/projects/{proyecto}/branches")["branches"]
    sala = next((b for b in ramas if b["name"] == "sala-vivo"), None)
    if not sala:
        padre = next(b for b in ramas if b.get("default"))
        sala = api("POST", f"/projects/{proyecto}/branches",
                   {"branch": {"name": "sala-vivo", "parent_id": padre["id"]}, "endpoints": [{"type": "read_write"}]})["branch"]
        time.sleep(5)
    base = f"/projects/{proyecto}/branches/{sala['id']}"
    if "sala_vivo" not in [r["name"] for r in api("GET", base + "/roles")["roles"]]:
        api("POST", base + "/roles", {"role": {"name": "sala_vivo"}})
        time.sleep(3)
    clave = api("POST", base + "/roles/sala_vivo/reset_password")["role"]["password"]
    host = api("GET", base + "/endpoints")["endpoints"][0]["host"]
    if "-pooler" not in host:
        host = host.replace(".", "-pooler.", 1)
    dbs = [d["name"] for d in api("GET", base + "/databases")["databases"]]
    db = "neondb" if "neondb" in dbs else dbs[0]

    destino = os.path.join(wt, ".env.local")
    with open(destino, "w") as f:
        f.write(f'# Copia (rama "sala-vivo" de Neon) para la Sala de VForge. Rol propio, solo vale en la copia. Fuera de git.\n'
                f'DATABASE_URL="postgresql://sala_vivo:{clave}@{host}/{db}?sslmode=require"\n')
    os.chmod(destino, 0o600)
    exclude = os.path.join(wt, ".git/info/exclude")
    if ".env.local" not in open(exclude).read():
        open(exclude, "a").write("\n.env.local\n")
    print(json.dumps({"ok": True, "rama": sala["id"], "db": db}))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""encargo.py — V despacha y aprende.

V no programa: redacta el encargo (con el elemento señalado, las reglas y lo que
ya aprendió de ese proyecto), lo mete a la cola real del daemon (dispatch_queue)
y, cuando el agente termina, guarda qué estuvo mal y cómo se corrigió.

Lo llama el motor vivo (vivo.mjs) por stdin/stdout, siempre en JSON:

  python3 encargo.py crear    < {"proyecto","etiquetaProyecto","pedido","elemento":{src,etiqueta,texto},"agente"}
  python3 encargo.py lista    < {"proyecto","limite"}
  python3 encargo.py esquema  (crea la tabla v_encargos si falta)

La conexión sale del entorno del servidor (NEON_DATABASE_URL_API, la misma base
del daemon). Aquí no vive ningún secreto.
"""
import json
import os
import re
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

AGENTES = {"claude"}  # codex entra cuando tenga su propia jaula
NOMBRE_OK = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
SRC_OK = re.compile(r"^[A-Za-z0-9_./@()\[\]+-]{1,300}:\d{1,6}(:\d{1,6})?$")

ESQUEMA = """
CREATE TABLE IF NOT EXISTS v_encargos (
  id           serial PRIMARY KEY,
  creado       timestamptz NOT NULL DEFAULT now(),
  cerrado      timestamptz,
  dispatch_id  integer,
  proyecto     text NOT NULL,
  agente       text NOT NULL,
  pedido       text NOT NULL,
  elemento     jsonb,
  estado       text NOT NULL DEFAULT 'en_cola',
  hice         text,
  revision     text,
  mal          text,
  correccion   text,
  leccion      text,
  commit_sha   text,
  archivos     jsonb,
  error        text
);
CREATE INDEX IF NOT EXISTS v_encargos_proyecto ON v_encargos (proyecto, creado DESC);
CREATE INDEX IF NOT EXISTS v_encargos_dispatch ON v_encargos (dispatch_id);
"""


def dsn():
    url = os.environ.get("NEON_DATABASE_URL_API", "").strip()
    if url:
        return url
    # El servicio vivo no carga /root/.env: se lee aquí, sin imprimir nada.
    try:
        with open("/root/.env", encoding="utf-8") as f:
            for linea in f:
                linea = linea.strip()
                if linea.startswith("NEON_DATABASE_URL_API="):
                    return linea.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    raise SystemExit(json.dumps({"error": "sin base de la cola (NEON_DATABASE_URL_API)"}))


def conectar():
    cn = psycopg2.connect(dsn(), cursor_factory=RealDictCursor, connect_timeout=10)
    cn.autocommit = True
    return cn


def limpio(texto, maximo):
    t = str(texto or "").replace("\x00", "").strip()
    return t[:maximo]


def lecciones(cur, proyecto, n=6):
    cur.execute(
        """SELECT leccion, mal, correccion FROM v_encargos
           WHERE proyecto=%s AND leccion IS NOT NULL AND leccion <> ''
           ORDER BY cerrado DESC NULLS LAST LIMIT %s""",
        (proyecto, n),
    )
    return cur.fetchall()


def redactar(num, proyecto, etiqueta_proyecto, pedido, el, aprendido):
    """El README de V: así escribe V cada encargo. Siempre pide revisar."""
    texto_el = limpio(el.get("texto"), 160).replace("\n", " ")
    if aprendido:
        memoria = "\n".join(
            f"- {limpio(a['leccion'], 240)}"
            + (f" (antes falló: {limpio(a['mal'], 120)})" if a.get("mal") and a["mal"].lower() != "nada" else "")
            for a in aprendido
        )
    else:
        memoria = "- (nada todavía: este es de los primeros encargos en este proyecto)"
    return f"""VIVO PROYECTO {proyecto}
ENCARGO V #{num}

Eres las manos de V (VForge). Trabajas en el worktree vivo de "{etiqueta_proyecto}": es tu directorio actual. Un servidor de desarrollo lo está sirviendo ahora mismo, así que lo que guardes aparece en la Sala por recarga en caliente.

EL PEDIDO DE LUIS
{pedido}

EL ELEMENTO QUE SEÑALÓ EN LA SALA
- Archivo y línea: {el.get('src')}
- Etiqueta: <{limpio(el.get('etiqueta'), 40)}>
- Texto visible: "{texto_el}"

REGLAS
1. Cambia lo mínimo que resuelve el pedido, empezando por ese archivo y esa línea. Si tienes que tocar otro archivo, dilo en el cierre.
2. Respeta el sistema de diseño que ya tiene el proyecto (tokens, clases, componentes). No inventes un lenguaje visual nuevo ni metas colores fijos si el proyecto usa tokens.
3. Una sola acción principal por pantalla.
4. NO hagas commit, push ni deploy (el motor guarda tu cambio solo). NO corras `next build` ni `npm run dev`: el servidor ya está corriendo y un build le rompe la caché. NO toques next.config.*, .vf-vivo/, package.json ni el lockfile.
5. Nada de secretos, llaves ni IPs en el código.

VUELVE A REVISAR (obligatorio)
Cuando creas que terminaste, revisa tu propio trabajo: corre `git diff`, relee cada línea contra el pedido y las reglas, y si el proyecto es TypeScript corre `npx tsc --noEmit -p .` (si el proyecto ya traía errores, separa cuáles son tuyos). Corrige lo que encuentres ANTES de cerrar. Un cambio sin revisar no cuenta como terminado.

LO QUE V YA APRENDIÓ EN ESTE PROYECTO
{memoria}

CIERRE (obligatorio, con este formato exacto, al final de tu respuesta)
=== APRENDIZAJE ===
PEDIDO: el pedido en una línea
HICE: archivos y qué cambió
REVISION: qué encontraste al revisar tu propio cambio
MAL: qué estaba mal (en el código original o en tu primer intento); "nada" si nada
CORRECCION: cómo lo corregiste
LECCION: una regla corta y reutilizable para el próximo encargo en este proyecto
=== FIN ===
"""


def crear(d):
    proyecto = str(d.get("proyecto") or "")
    if not NOMBRE_OK.match(proyecto):
        return {"error": "proyecto inválido"}
    pedido = limpio(d.get("pedido"), 2000)
    if len(pedido) < 3:
        return {"error": "el pedido está vacío"}
    agente = str(d.get("agente") or "claude").lower()
    if agente not in AGENTES:
        return {"error": "agente inválido"}
    el = d.get("elemento") or {}
    src = str(el.get("src") or "")
    if ".." in src or not SRC_OK.match(src):
        return {"error": "el elemento no trae archivo:línea válido"}
    el = {"src": src, "etiqueta": limpio(el.get("etiqueta"), 40), "texto": limpio(el.get("texto"), 300)}
    etiqueta_proyecto = limpio(d.get("etiquetaProyecto"), 80) or proyecto

    cn = conectar()
    cn.autocommit = False  # encargo y job entran juntos o no entra ninguno
    with cn, cn.cursor() as cur:
        cur.execute(ESQUEMA)
        cur.execute(
            "INSERT INTO v_encargos (proyecto, agente, pedido, elemento) VALUES (%s,%s,%s,%s) RETURNING id",
            (proyecto, agente, pedido, json.dumps(el, ensure_ascii=False)),
        )
        num = cur.fetchone()["id"]
        prompt = redactar(num, proyecto, etiqueta_proyecto, pedido, el, lecciones(cur, proyecto))
        meta = {"tipo": "encargo_v", "encargo": num, "proyecto": proyecto, "timeout_secs": 1500}
        # agent "<agente>-encargo": ningún consumidor viejo de agent='claude'
        # (claude_loop.py) lo toma; solo el daemon con la jaula.
        cur.execute(
            """INSERT INTO dispatch_queue (agent, prompt, priority, source, status, metadata, gajo, project_id)
               VALUES (%s,%s,%s,%s,'pending',%s::jsonb,%s,%s) RETURNING id""",
            (f"{agente}-encargo", prompt, 1, f"encargo-v:{proyecto}", json.dumps(meta), f"vivo-{proyecto}"[:60], proyecto),
        )
        did = cur.fetchone()["id"]
        cur.execute("UPDATE v_encargos SET dispatch_id=%s WHERE id=%s", (did, num))
    return {"ok": True, "encargo": num, "dispatch": did}


def lista(d):
    proyecto = str(d.get("proyecto") or "")
    if not NOMBRE_OK.match(proyecto):
        return {"error": "proyecto inválido"}
    limite = max(1, min(int(d.get("limite") or 8), 30))
    with conectar() as cn, cn.cursor() as cur:
        cur.execute(ESQUEMA)
        cur.execute(
            """SELECT e.id, e.creado, e.cerrado, e.agente, e.pedido, e.elemento, e.estado,
                      e.hice, e.revision, e.mal, e.correccion, e.leccion, e.commit_sha,
                      e.archivos, e.error,
                      q.status AS cola, q.progress_pct, q.log_tail
                 FROM v_encargos e LEFT JOIN dispatch_queue q ON q.id = e.dispatch_id
                WHERE e.proyecto=%s ORDER BY e.creado DESC LIMIT %s""",
            (proyecto, limite),
        )
        filas = cur.fetchall()
    salida = []
    for f in filas:
        estado = f["estado"]
        if estado == "en_cola" and f["cola"] == "running":
            estado = "trabajando"
        salida.append(
            {
                "id": f["id"],
                "creado": f["creado"].isoformat() if f["creado"] else None,
                "cerrado": f["cerrado"].isoformat() if f["cerrado"] else None,
                "agente": f["agente"],
                "pedido": f["pedido"],
                "elemento": f["elemento"],
                "estado": estado,
                "progreso": f["progress_pct"],
                "rastro": (f["log_tail"] or "")[-300:] if estado in ("en_cola", "trabajando") else None,
                "hice": f["hice"],
                "revision": f["revision"],
                "mal": f["mal"],
                "correccion": f["correccion"],
                "leccion": f["leccion"],
                "commit": f["commit_sha"],
                "archivos": f["archivos"],
                "error": f["error"],
            }
        )
    return {"ok": True, "encargos": salida}


def main():
    accion = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        if accion == "esquema":
            with conectar() as cn, cn.cursor() as cur:
                cur.execute(ESQUEMA)
            r = {"ok": True}
        else:
            d = json.loads(sys.stdin.read() or "{}")
            r = crear(d) if accion == "crear" else lista(d) if accion == "lista" else {"error": "acción desconocida"}
    except SystemExit:
        raise
    except Exception as e:  # sin detalles de conexión hacia afuera
        r = {"error": f"la cola no respondió ({type(e).__name__})"}
    print(json.dumps(r, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()

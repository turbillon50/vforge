"""
world_model.py — CAPA 1: el grafo de conocimiento vivo de Vulcano.

No es búsqueda de texto: es un grafo que Vulcano NAVEGA para razonar.
"¿Qué tecnologías usa Crede-ti y con cuáles ya fallamos antes?" se contesta
caminando aristas USES / FAILED_WITH, no haciendo un LIKE sobre un blob.

API principal:
  upsert_node(type, name, **props)            → crea/actualiza nodo, devuelve id
  link(a, b, relation, weight, **props)       → crea/refuerza arista
  neighbors(node, relation=None, depth=1)     → camina el grafo
  reason(node, question)                       → subgrafo + síntesis LLM
  ingest_session(summary)                      → ACTUALIZA el grafo tras una sesión
  decay()                                       → olvido: baja importancia/weight viejos

CLI:
  python3 world_model.py node Project vforge phase=landing
  python3 world_model.py link Project:vforge Technology:Neon USES
  python3 world_model.py reason Project:vforge "¿qué riesgos tiene este proyecto?"
  python3 world_model.py decay
"""
import re
import sys
import json

from db import q, one, run, llm


# ---------------------------------------------------------------- nodos -------
def upsert_node(ntype, name, importance=None, **props):
    """Crea el nodo o fusiona properties si ya existe. Devuelve su id (uuid str)."""
    row = run(
        """
        INSERT INTO kg_nodes (type, name, properties, importance)
        VALUES (%s, %s, %s, COALESCE(%s, 0.5))
        ON CONFLICT (type, name) DO UPDATE SET
          properties  = kg_nodes.properties || EXCLUDED.properties,
          hits        = kg_nodes.hits + 1,
          importance  = LEAST(1.0, kg_nodes.importance + 0.05),
          last_seen_at = now(),
          updated_at  = now()
        RETURNING id
        """,
        (ntype, name, json.dumps(props or {}), importance),
    )
    return str(row["id"])


def _resolve(ref):
    """'Project:vforge' o un uuid → id de nodo."""
    if ":" in ref and "-" not in ref.split(":")[0]:
        ntype, name = ref.split(":", 1)
        r = one("SELECT id FROM kg_nodes WHERE type=%s AND name=%s", (ntype, name))
        return str(r["id"]) if r else None
    return ref


# --------------------------------------------------------------- aristas ------
def link(a, b, relation, weight=1.0, **props):
    """Crea o REFUERZA la arista a→b. Reforzar = subir weight, no duplicar."""
    fa, fb = _resolve(a), _resolve(b)
    if not (fa and fb):
        raise ValueError(f"nodo no encontrado: {a if not fa else b}")
    run(
        """
        INSERT INTO kg_edges (from_id, to_id, relation, weight, properties)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (from_id, to_id, relation) DO UPDATE SET
          weight = LEAST(5.0, kg_edges.weight + 0.5),
          properties = kg_edges.properties || EXCLUDED.properties,
          last_reinforced_at = now()
        """,
        (fa, fb, relation, weight, json.dumps(props or {})),
    )


# ----------------------------------------------------------- navegación -------
def neighbors(ref, relation=None, depth=1, min_weight=0.0):
    """Camina el grafo desde `ref` hasta `depth` saltos. Devuelve subgrafo.

    Usa un CTE recursivo: esto es RAZONAR sobre estructura, no buscar texto.
    Devuelve {nodes: [...], edges: [...]}.
    """
    start = _resolve(ref)
    if not start:
        return {"nodes": [], "edges": []}
    rel_filter = "AND e.relation = %s" if relation else ""
    # placeholders en orden: start (CTE seed x2), depth, [relation], min_weight
    walk_params = [start, start, depth] + ([relation] if relation else []) + [min_weight]
    rows = q(
        f"""
        WITH RECURSIVE walk(node_id, depth, path) AS (
          SELECT %s::uuid, 0, ARRAY[%s::uuid]
          UNION ALL
          SELECT e.to_id, w.depth + 1, w.path || e.to_id
          FROM walk w
          JOIN kg_edges e ON e.from_id = w.node_id
          WHERE w.depth < %s
            AND NOT e.to_id = ANY(w.path)      -- evita ciclos
            {rel_filter}
            AND e.weight >= %s
        )
        SELECT DISTINCT n.id, n.type, n.name, n.properties, n.importance,
               w.depth
        FROM walk w JOIN kg_nodes n ON n.id = w.node_id
        ORDER BY w.depth, n.importance DESC
        """,
        walk_params,
    )
    node_ids = [str(r["id"]) for r in rows]
    edges = []
    if node_ids:
        edges = q(
            """
            SELECT e.from_id, e.to_id, e.relation, e.weight,
                   nf.name AS from_name, nt.name AS to_name
            FROM kg_edges e
            JOIN kg_nodes nf ON nf.id = e.from_id
            JOIN kg_nodes nt ON nt.id = e.to_id
            WHERE e.from_id = ANY(%s::uuid[]) AND e.to_id = ANY(%s::uuid[])
            """,
            (node_ids, node_ids),
        )
    return {"nodes": rows, "edges": edges}


def reason(ref, question):
    """Razona sobre un nodo: extrae su subgrafo (2 saltos) y lo sintetiza.

    Esto es lo que hace a V "pensar con el grafo": le da al LLM la ESTRUCTURA
    (proyecto → tecnologías → lecciones/fallos) y le pide conclusión causal.
    """
    sub = neighbors(ref, depth=2)
    if not sub["nodes"]:
        return f"No tengo nada en el grafo sobre {ref}."
    facts = []
    for e in sub["edges"]:
        facts.append(f"({e['from_name']}) -[{e['relation']} w={e['weight']:.1f}]-> ({e['to_name']})")
    ctx = "\n".join(facts) or "sin aristas"
    prompt = (
        f"Subgrafo de conocimiento de Vulcano alrededor de '{ref}':\n{ctx}\n\n"
        f"Pregunta: {question}\n"
        "Razona SOBRE LA ESTRUCTURA (dependencias, fallos previos, patrones), "
        "no inventes. Da una conclusión accionable en 3-5 líneas."
    )
    out = llm(prompt, system="Eres el módulo de razonamiento de grafo de Vulcano.")
    return out or "(síntesis no disponible; revisa el subgrafo crudo)"


# --------------------------------------------------- query libre del grafo ----
def _find_entry_nodes(question, limit=4):
    """Pregunta en lenguaje natural → nodos de entrada relevantes.

    Sin embeddings locales: ranking léxico robusto sobre nombre + properties
    usando FTS en español y coincidencia por término. Determinista y sin
    dependencias. (Si algún día hay columna `embedding`, se enchufa aquí el
    <=> de pgvector sin tocar a los llamadores.)
    """
    terms = [t for t in re.findall(r"[\wáéíóúñ]+", question.lower()) if len(t) > 2]
    if not terms:
        return []
    like_clauses = " OR ".join(["blob ILIKE %s"] * len(terms))
    params = [f"%{t}%" for t in terms]
    # score = nº de términos que aparecen + boost por FTS + importancia del nodo
    rows = q(
        f"""
        WITH cand AS (
          SELECT id, type, name, importance,
                 lower(name || ' ' || coalesce(properties::text,'')) AS blob
          FROM kg_nodes
        )
        SELECT id, type, name, importance,
               ( ({like_clauses})::int
                 + ts_rank(to_tsvector('spanish', blob),
                           plainto_tsquery('spanish', %s)) * 4
                 + importance ) AS score
        FROM cand
        WHERE ({like_clauses})
           OR to_tsvector('spanish', blob) @@ plainto_tsquery('spanish', %s)
        ORDER BY score DESC
        LIMIT %s
        """,
        params + [question] + params + [question, limit],
    )
    return rows


def _kg_query(question, depth=2):
    """API pública del grafo: pregunta libre → contexto estructurado para V.

    1. Encuentra nodos de entrada relevantes (ranking léxico/FTS).
    2. Camina el grafo `depth` saltos desde cada uno (CTE recursivo).
    3. Devuelve contexto estructurado: nodos de entrada, hechos (aristas) y un
       brief en texto listo para inyectar en el system prompt de Vulcano/V.

    Devuelve dict: {question, entry_nodes, facts, nodes, brief}.
    """
    entries = _find_entry_nodes(question)
    if not entries:
        return {"question": question, "entry_nodes": [], "facts": [],
                "nodes": [], "brief": f"El grafo no tiene nodos sobre: {question}"}

    seen_nodes, facts, edge_keys = {}, [], set()
    for en in entries:
        sub = neighbors(str(en["id"]), depth=depth)
        for n in sub["nodes"]:
            seen_nodes[str(n["id"])] = n
        for e in sub["edges"]:
            k = (e["from_id"], e["relation"], e["to_id"])
            if k in edge_keys:
                continue
            edge_keys.add(k)
            facts.append(f"({e['from_name']}) -[{e['relation']} "
                         f"w={e['weight']:.1f}]-> ({e['to_name']})")

    entry_labels = [f"{e['type']}:{e['name']}" for e in entries]
    brief_lines = [f"Entradas: {', '.join(entry_labels)}",
                   f"Nodos alcanzados: {len(seen_nodes)} a {depth} saltos", "Hechos:"]
    brief_lines += [f"  · {f}" for f in facts[:40]]
    return {
        "question": question,
        "entry_nodes": [{"id": str(e["id"]), "type": e["type"], "name": e["name"],
                         "score": round(float(e["score"]), 3)} for e in entries],
        "facts": facts,
        "nodes": [{"id": k, "type": v["type"], "name": v["name"]}
                  for k, v in seen_nodes.items()],
        "brief": "\n".join(brief_lines),
    }


# ----------------------------------------------------- ingestión auto ---------
def ingest_session(summary):
    """ACTUALIZA el grafo automáticamente tras una sesión.

    `summary` = texto libre de lo que pasó. El LLM extrae triples
    (nodo, relación, nodo) tipados y los aplica. Esto es lo que mantiene el
    World Model VIVO sin que Luis lo edite a mano.
    """
    from db import llm_json
    schema = (
        "Extrae triples del resumen como JSON: "
        '{"nodes":[{"type":"Project|Client|Technology|Pattern|Lesson|Person|Decision|Event",'
        '"name":"...","props":{}}],'
        '"edges":[{"from":"Type:name","to":"Type:name",'
        '"relation":"USES|DEPENDS_ON|LEARNED_FROM|FAILED_WITH|SUCCEEDED_WITH|BELONGS_TO|RELATED_TO|CAUSED|SOLVED_BY"}]}'
    )
    data = llm_json(f"{schema}\n\nResumen de sesión:\n{summary}")
    if not data:
        return {"nodes": 0, "edges": 0}
    nmap = {}
    for n in data.get("nodes", []):
        try:
            nid = upsert_node(n["type"], n["name"], **(n.get("props") or {}))
            nmap[f"{n['type']}:{n['name']}"] = nid
        except Exception:  # noqa: BLE001
            continue
    ecount = 0
    for e in data.get("edges", []):
        try:
            link(e["from"], e["to"], e["relation"])
            ecount += 1
        except Exception:  # noqa: BLE001
            continue
    return {"nodes": len(nmap), "edges": ecount}


def decay(node_half_life_days=30, edge_half_life_days=21):
    """Olvido controlado: lo que no se toca pierde importancia/peso.

    Mantiene el grafo enfocado en lo vigente. Corre diario desde el daemon.
    """
    run(
        """
        UPDATE kg_nodes SET importance = GREATEST(0.0,
          importance * exp(-EXTRACT(EPOCH FROM (now()-last_seen_at))/86400.0/%s))
        """,
        (node_half_life_days,),
    )
    run(
        """
        UPDATE kg_edges SET weight = GREATEST(0.1,
          weight * exp(-EXTRACT(EPOCH FROM (now()-last_reinforced_at))/86400.0/%s))
        """,
        (edge_half_life_days,),
    )


# ------------------------------------------------------------------- CLI ------
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "node":
        ntype, name = sys.argv[2], sys.argv[3]
        props = dict(kv.split("=", 1) for kv in sys.argv[4:] if "=" in kv)
        print(upsert_node(ntype, name, **props))
    elif cmd == "link":
        print(link(sys.argv[2], sys.argv[3], sys.argv[4]))
    elif cmd == "neighbors":
        print(json.dumps(neighbors(sys.argv[2], depth=int(sys.argv[3]) if len(sys.argv) > 3 else 1), indent=2, default=str))
    elif cmd == "reason":
        print(reason(sys.argv[2], sys.argv[3]))
    elif cmd == "query":
        depth = int(sys.argv[3]) if len(sys.argv) > 3 else 2
        print(json.dumps(_kg_query(sys.argv[2], depth=depth), indent=2, default=str))
    elif cmd == "decay":
        decay(); print("decay aplicado")
    else:
        print(__doc__)

"""
episodic.py — CAPA 4: memoria episódica real.

No son embeddings sueltos: son EPISODIOS completos y estructurados que Vulcano
puede narrar. "¿Recuerdas cuando arreglamos Crede-ti?" devuelve qué pasó, qué se
decidió y qué se aprendió — con la gente y los proyectos involucrados.

  synthesize_episode(raw)   ← al cerrar una sesión importante, destila el episodio
  remember(query)            ← recupera episodios por FTS español + importancia
  narrate(query)             ← recupera y NARRA en voz de Vulcano (para el chat)
  timeline(project)          ← línea de tiempo de un proyecto

La síntesis enlaza el episodio al World Model (node_ids) para cruzar memoria↔grafo.

CLI:
  python3 episodic.py save "arreglamos el maxDuration de vforge tras 3 deploys fallidos"
  python3 episodic.py remember "vforge deploy"
  python3 episodic.py narrate "cuando arreglamos vercel"
"""
import sys
import json

from db import q, run, llm, llm_json


def synthesize_episode(raw_text, session_id=None, importance=None):
    """Destila un episodio estructurado desde el log crudo de una sesión.

    Esto corre AL CERRAR una sesión importante. Vulcano no guarda el transcript:
    guarda el SIGNIFICADO (qué pasó / qué se decidió / qué se aprendió).
    """
    data = llm_json(
        "Sintetiza esta sesión como un EPISODIO de memoria en JSON:\n"
        '{"title":"frase corta memorable",'
        '"what_happened":"...","what_was_decided":"...","what_was_learned":"...",'
        '"people_involved":["Luis",...],"projects_affected":["vforge",...],'
        '"importance":1-10}\n\n'
        f"Sesión:\n{raw_text[:6000]}",
        system="Eres la memoria episódica de Vulcano. Conciso, fiel, sin inventar.",
    )
    if not data:
        # Fallback determinista: guarda el crudo como un episodio mínimo.
        data = {"title": raw_text[:60], "what_happened": raw_text[:1000],
                "what_was_decided": "", "what_was_learned": "",
                "people_involved": ["Luis"], "projects_affected": [],
                "importance": importance or 5}

    # Enlaza a nodos del grafo (proyectos/personas) para navegación cruzada.
    node_ids = _link_to_graph(data)

    row = run(
        """INSERT INTO episodes
             (title, what_happened, what_was_decided, what_was_learned,
              people_involved, projects_affected, importance, node_ids, session_id)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
        (data["title"], data["what_happened"], data.get("what_was_decided"),
         data.get("what_was_learned"),
         data.get("people_involved") or ["Luis"],
         data.get("projects_affected") or [],
         importance or int(data.get("importance", 5)),
         node_ids, session_id),
    )
    return str(row["id"])


def _link_to_graph(data):
    """Crea/refuerza nodos Project y Person, devuelve sus uuids."""
    ids = []
    try:
        import world_model as wm
        for p in (data.get("projects_affected") or []):
            ids.append(wm.upsert_node("Project", p))
        for person in (data.get("people_involved") or []):
            ids.append(wm.upsert_node("Person", person))
        # Conecta personas↔proyectos del episodio.
        for person in (data.get("people_involved") or []):
            for p in (data.get("projects_affected") or []):
                try:
                    wm.link(f"Person:{person}", f"Project:{p}", "BELONGS_TO")
                except Exception:  # noqa: BLE001
                    pass
    except Exception:  # noqa: BLE001
        pass
    return ids


def remember(query, limit=5, min_importance=1):
    """Recupera episodios por relevancia léxica (FTS español) + importancia."""
    return q(
        """SELECT id, ts, title, what_happened, what_was_decided, what_was_learned,
                  people_involved, projects_affected, importance,
                  ts_rank(to_tsvector('spanish',
                    title||' '||what_happened||' '||coalesce(what_was_decided,'')||' '||
                    coalesce(what_was_learned,'')),
                    plainto_tsquery('spanish', %s)) AS rank
           FROM episodes
           WHERE importance >= %s
             AND to_tsvector('spanish',
                   title||' '||what_happened||' '||coalesce(what_was_decided,'')||' '||
                   coalesce(what_was_learned,'')) @@ plainto_tsquery('spanish', %s)
           ORDER BY rank DESC, importance DESC, ts DESC
           LIMIT %s""",
        (query, min_importance, query, limit),
    )


def narrate(query):
    """Recupera y narra en voz de Vulcano (español casual, para el chat con Luis)."""
    eps = remember(query, limit=4)
    if not eps:
        return "No tengo un recuerdo claro de eso, hermano. ¿Cuándo fue, más o menos?"
    ctx = "\n\n".join(
        f"[{e['ts']:%Y-%m-%d}] {e['title']}\n"
        f"Pasó: {e['what_happened']}\nSe decidió: {e['what_was_decided']}\n"
        f"Se aprendió: {e['what_was_learned']}"
        for e in eps
    )
    out = llm(
        f"Recuerdos relevantes:\n{ctx}\n\n"
        f"Luis pregunta: '{query}'. Responde como Vulcano: español mexicano casual, "
        "primera persona, con los detalles reales de arriba. No inventes datos.",
        system="Eres Vulcano narrando tu propia memoria a Luis.",
    )
    return out or eps[0]["title"]


def timeline(project, limit=20):
    """Línea de tiempo de un proyecto, del episodio más reciente al más viejo."""
    return q(
        """SELECT ts, title, what_was_decided, importance FROM episodes
           WHERE %s = ANY(projects_affected)
           ORDER BY ts DESC LIMIT %s""",
        (project, limit),
    )


# ------------------------------------------------------------------- CLI ------
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "save":
        print(synthesize_episode(sys.argv[2]))
    elif cmd == "remember":
        print(json.dumps(remember(sys.argv[2]), indent=2, default=str))
    elif cmd == "narrate":
        print(narrate(sys.argv[2]))
    elif cmd == "timeline":
        print(json.dumps(timeline(sys.argv[2]), indent=2, default=str))
    else:
        print(__doc__)

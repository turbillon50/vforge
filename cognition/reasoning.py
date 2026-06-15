"""
reasoning.py — CAPA 5: razonamiento multi-etapa (Chain of Thought persistente).

El enjambre actual hace inferencia y la tira. Aquí el razonamiento SE GUARDA,
se valida con Luis y se REUSA: ante un problema parecido, Vulcano recupera la
cadena previa y la extiende en vez de empezar de cero.

  think(question, context)        ← construye una cadena de pasos y la guarda
  recall_similar(question)        ← busca cadenas previas por fingerprint + FTS
  validate(chain_id, ok)          ← Luis confirma/niega → sube/baja confidence
  extend(chain_id, new_question)  ← parte de una cadena previa (parent_chain_id)

Una cadena = [{n, thought, evidence, action}], conclusion, confidence.
El razonamiento se nutre del World Model y la memoria episódica (no del vacío).

CLI:
  python3 reasoning.py think "¿por qué falla el deploy de vforge en Vercel?"
  python3 reasoning.py recall "deploy vercel falla"
  python3 reasoning.py validate <chain_id> 1
"""
import re
import sys
import json

from db import q, one, run, llm_json


_STOP = {"el", "la", "los", "las", "de", "que", "en", "por", "para", "un", "una",
         "como", "se", "del", "al", "y", "o", "a", "es", "con", "qué", "cómo",
         "por qué", "porque", "cuando", "cuándo"}


def fingerprint(question):
    """Huella normalizada: palabras clave ordenadas. Agrupa preguntas similares."""
    words = re.findall(r"[a-záéíóúñ0-9]+", (question or "").lower())
    keys = sorted(set(w for w in words if len(w) > 3 and w not in _STOP))
    return " ".join(keys[:8])


def recall_similar(question, limit=3):
    """Cadenas previas parecidas: match exacto de fingerprint o solape FTS."""
    fp = fingerprint(question)
    exact = q(
        "SELECT * FROM reasoning_chains WHERE fingerprint=%s ORDER BY confidence DESC, reuse_count DESC LIMIT %s",
        (fp, limit),
    )
    if exact:
        return exact
    return q(
        """SELECT *, ts_rank(to_tsvector('spanish', question||' '||coalesce(conclusion,'')),
                            plainto_tsquery('spanish', %s)) AS rank
           FROM reasoning_chains
           WHERE to_tsvector('spanish', question||' '||coalesce(conclusion,''))
                 @@ plainto_tsquery('spanish', %s)
           ORDER BY rank DESC, confidence DESC LIMIT %s""",
        (question, question, limit),
    )


def _gather_context(question):
    """Nutre el razonamiento con grafo + episodios (no razona en el vacío)."""
    bits = []
    try:
        import episodic
        for e in episodic.remember(question, limit=2):
            bits.append(f"[episodio {e['ts']:%Y-%m-%d}] {e['title']}: {e['what_was_learned'] or e['what_happened']}")
    except Exception:  # noqa: BLE001
        pass
    try:
        import learning
        rules = learning.active_rules()
        for r in rules[:5]:
            bits.append(f"[heurística] {r['rule']}")
    except Exception:  # noqa: BLE001
        pass
    return "\n".join(bits) or "(sin contexto previo)"


def think(question, context_hint="", reuse=True):
    """Construye una cadena de razonamiento, la guarda y la devuelve.

    Si hay una cadena previa de alta confianza, la EXTIENDE en lugar de rehacer.
    """
    prior = recall_similar(question) if reuse else []
    parent = None
    prior_block = ""
    if prior and prior[0].get("confidence", 0) >= 0.6:
        parent = prior[0]
        prior_block = (
            f"\nCADENA PREVIA (confianza {parent['confidence']:.2f}, "
            f"validada={parent['validated_by_luis']}):\n"
            f"{json.dumps(parent['steps'], ensure_ascii=False)}\n"
            f"Conclusión previa: {parent['conclusion']}\n"
            "Extiéndela o corrígela; no la repitas a ciegas.")

    ctx = _gather_context(question)
    data = llm_json(
        f"Pregunta compleja: {question}\n"
        f"Pista: {context_hint}\n"
        f"Contexto de memoria/heurísticas:\n{ctx}{prior_block}\n\n"
        "Razona en pasos explícitos como JSON:\n"
        '{"steps":[{"n":1,"thought":"...","evidence":"...","action":"..."}],'
        '"conclusion":"qué hacer concretamente","confidence":0.0-1.0}',
        system="Eres el módulo de razonamiento deliberado de Vulcano. "
               "Pasos cortos, basados en evidencia, accionables.",
    )
    if not data:
        return None

    row = run(
        """INSERT INTO reasoning_chains
             (question, fingerprint, steps, conclusion, confidence, parent_chain_id)
           VALUES (%s,%s,%s,%s,%s,%s) RETURNING id""",
        (question, fingerprint(question), json.dumps(data["steps"], ensure_ascii=False),
         data.get("conclusion"), float(data.get("confidence", 0.5)),
         parent["id"] if parent else None),
    )
    if parent:
        run("UPDATE reasoning_chains SET reuse_count=reuse_count+1 WHERE id=%s",
            (parent["id"],))
    return {"id": str(row["id"]), **data, "extended_from": parent["id"] if parent else None}


def validate(chain_id, ok):
    """Luis valida la cadena. Ajusta confidence y propaga la señal a heurísticas."""
    delta = 0.25 if ok else -0.35
    chain = run(
        """UPDATE reasoning_chains
           SET validated_by_luis=%s,
               confidence=GREATEST(0.0, LEAST(1.0, confidence+%s)),
               updated_at=now()
           WHERE id=%s RETURNING question, conclusion""",
        (bool(ok), delta, chain_id),
    )
    # Una cadena validada se vuelve feedback positivo para la capa 2.
    if chain:
        try:
            import learning
            learning.record_feedback(
                2 if ok else -1,
                action_taken=f"razonó: {chain['question']}",
                result=chain["conclusion"] or "",
                context={"source": "reasoning_chain"})
        except Exception:  # noqa: BLE001
            pass
    return chain


def extend(chain_id, new_question):
    """Parte explícitamente de una cadena existente."""
    parent = one("SELECT * FROM reasoning_chains WHERE id=%s", (chain_id,))
    if not parent:
        return None
    hint = f"Basado en la cadena previa sobre: {parent['question']}"
    return think(new_question, context_hint=hint, reuse=False)


# ------------------------------------------------------------------- CLI ------
if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    if cmd == "think":
        print(json.dumps(think(sys.argv[2]), indent=2, ensure_ascii=False))
    elif cmd == "recall":
        print(json.dumps(recall_similar(sys.argv[2]), indent=2, default=str, ensure_ascii=False))
    elif cmd == "validate":
        print(validate(sys.argv[2], int(sys.argv[3])))
    else:
        print(__doc__)

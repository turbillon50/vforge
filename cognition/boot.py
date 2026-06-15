"""
boot.py — ensambla la "mente activa" de Vulcano para inyectar al system prompt.

Lo llama el chat de V (brain-relay) al inicio de CADA turno. Es el puente entre
las 5 capas persistentes y el LLM efímero: convierte memoria, heurísticas,
episodios y razonamiento previo en contexto que cambia la respuesta de V.

  build_context(question, project=None, session_id=None) -> str

Es barato (consultas indexadas) y tolerante: si una capa falla, sigue con el resto.

CLI:  python3 boot.py "¿por qué falla el deploy de vforge?" vforge
"""
import sys

from db import q


def build_context(question, project=None, session_id=None):
    scope = f"project:{project}" if project else "global"
    blocks = []

    # 1. Heurísticas aprendidas (capa 2) — lo que más cambia el comportamiento.
    try:
        import learning
        rules = learning.render_rules_for_prompt(scope)
        if rules:
            blocks.append(rules)
    except Exception:  # noqa: BLE001
        pass

    # 2. Razonamiento previo reusable (capa 5).
    try:
        import reasoning
        prior = reasoning.recall_similar(question, limit=1)
        if prior and prior[0].get("conclusion"):
            p = prior[0]
            blocks.append(
                f"# RAZONAMIENTO PREVIO (confianza {p['confidence']:.2f}):\n"
                f"P: {p['question']}\n→ {p['conclusion']}")
    except Exception:  # noqa: BLE001
        pass

    # 3. Memoria episódica relevante (capa 4).
    try:
        import episodic
        eps = episodic.remember(question, limit=2)
        if eps:
            lines = ["# RECUERDOS RELEVANTES:"]
            for e in eps:
                lines.append(f"- [{e['ts']:%Y-%m-%d}] {e['title']}: "
                             f"{e['what_was_learned'] or e['what_happened']}")
            blocks.append("\n".join(lines))
    except Exception:  # noqa: BLE001
        pass

    # 4. Conocimiento estructural del proyecto (capa 1).
    if project:
        try:
            import world_model as wm
            insight = wm.reason(f"Project:{project}",
                                "¿qué debo recordar antes de tocar esto?")
            if insight and "No tengo" not in insight:
                blocks.append(f"# GRAFO — {project}:\n{insight}")
        except Exception:  # noqa: BLE001
            pass

    # 5. Anomalías abiertas que el daemon detectó (capa 3).
    try:
        obs = q("SELECT kind, subject, detail FROM observations "
                "WHERE status IN ('open','notified') AND severity='critical' LIMIT 5")
        if obs:
            lines = ["# ⚠️ ABIERTO AHORA MISMO:"]
            for o in obs:
                lines.append(f"- {o['kind']} {o['subject']}: {o['detail']}")
            blocks.append("\n".join(lines))
    except Exception:  # noqa: BLE001
        pass

    return "\n\n".join(blocks)


if __name__ == "__main__":
    quest = sys.argv[1] if len(sys.argv) > 1 else "estado general"
    proj = sys.argv[2] if len(sys.argv) > 2 else None
    print(build_context(quest, proj))

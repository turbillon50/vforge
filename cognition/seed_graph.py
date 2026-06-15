#!/usr/bin/env python3
"""
seed_graph.py — Puebla el World Model (kg_nodes/kg_edges) desde el Brain real.

Lee las tablas vivas de Neon (projects, patterns, lessons) y las proyecta al
grafo de conocimiento de Vulcano. Luis es el centro: todo proyecto le pertenece,
cada proyecto USA tecnologías, cada lección se APRENDIÓ_DE un proyecto (y marca
si fue FALLO o ÉXITO), cada patrón se RELACIONA con los proyectos donde aplica.

Idempotente: upsert_node y link fusionan/refuerzan, no duplican. Correr de nuevo
solo reforza pesos y actualiza properties.

Uso:  python3 seed_graph.py
"""
import re
import sys

from db import q
import world_model as wm

LUIS = ("Person", "Luis Humberto De la Torre")

STOP = {"todos", "todas", "ecosistema", "all", "general", ""}


def _slugify(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def build_project_index(projects):
    """alias-token -> nombre de nodo Project. Resuelve slugs cortos a proyectos."""
    idx = {}
    for p in projects:
        node_name = p["name"]
        aliases = set()
        aliases.add(_slugify(p["id"]))
        aliases.add(_slugify(p["name"]))
        # primera palabra del nombre ("Castores Store" -> "castores")
        first = _slugify((p["name"] or "").split()[0]) if p["name"] else ""
        if first:
            aliases.add(first)
        # dominio sin TLD ("castores.live" -> "castores")
        dom = (p.get("domain") or "").split(".")[0]
        if dom:
            aliases.add(_slugify(dom))
        for a in aliases:
            if a and a not in STOP:
                idx.setdefault(a, node_name)
    return idx


def resolve_project(token, idx):
    t = _slugify(token)
    if not t or t in STOP:
        return None
    if t in idx:
        return idx[t]
    # substring: el token contiene un alias o un alias contiene al token
    for alias, name in idx.items():
        if t in alias or alias in t:
            return name
    return None


def tech_tokens(stack):
    """Extrae (role, tech) de un stack jsonb heterogéneo (obj / string / array)."""
    out = []
    if isinstance(stack, dict):
        for role, val in stack.items():
            if not val:
                continue
            for tok in re.split(r"[,/]", str(val)):
                tok = tok.strip()
                if tok:
                    out.append((role, tok))
    elif isinstance(stack, list):
        for val in stack:
            if val:
                out.append(("tech", str(val).strip()))
    elif isinstance(stack, str) and stack.strip():
        out.append(("tech", stack.strip()))
    return out


def main():
    stats = {"nodes": 0, "edges": 0}

    def node(*a, **k):
        wm.upsert_node(*a, **k)
        stats["nodes"] += 1

    def edge(a, b, rel, **k):
        try:
            wm.link(a, b, rel, **k)
            stats["edges"] += 1
        except ValueError:
            pass  # nodo no resuelto: se omite la arista, no se inventa

    # --- centro del grafo: Luis -------------------------------------------
    node(*LUIS, importance=1.0, role="owner",
         company="All Global Holding LLC / V Momentum / VForge")
    luis_ref = f"{LUIS[0]}:{LUIS[1]}"

    # --- proyectos + tecnologías ------------------------------------------
    projects = q("SELECT id, name, domain, phase, active, github_repo, "
                 "vercel_project_id, stack FROM projects")
    pidx = build_project_index(projects)

    for p in projects:
        pref = f"Project:{p['name']}"
        node("Project", p["name"], importance=0.7 if p["active"] else 0.4,
             domain=p.get("domain") or "", phase=p.get("phase") or "",
             active=bool(p["active"]), github=p.get("github_repo") or "")
        edge(pref, luis_ref, "BELONGS_TO")
        for role, tech in tech_tokens(p.get("stack")):
            node("Technology", tech, importance=0.6)
            edge(pref, f"Technology:{tech}", "USES", role=role)

    # --- lecciones: aprendidas de proyectos, marcadas fallo/éxito ----------
    lessons = q("SELECT id, project_id, type, area, lesson, fix FROM lessons "
                "WHERE archived IS NOT TRUE")
    for ls in lessons:
        lname = f"L{ls['id']}: {(ls.get('area') or 'general')} — " \
                f"{(ls.get('lesson') or '')[:48]}"
        node("Lesson", lname, importance=0.5,
             type=ls.get("type") or "", area=ls.get("area") or "",
             fix=ls.get("fix") or "")
        lref = f"Lesson:{lname}"
        proj = resolve_project(ls.get("project_id"), pidx)
        if proj:
            pref = f"Project:{proj}"
            edge(lref, pref, "LEARNED_FROM")
            if (ls.get("type") or "").lower() in ("error", "fallo", "fail"):
                edge(pref, lref, "FAILED_WITH")
            elif (ls.get("type") or "").lower() in ("acierto", "win", "success"):
                edge(pref, lref, "SUCCEEDED_WITH")

    # --- patrones: relacionados a los proyectos donde aplican --------------
    patterns = q("SELECT id, title, problem, fix, applies_to, tags, wins, losses "
                 "FROM patterns WHERE archived IS NOT TRUE")
    for pt in patterns:
        node("Pattern", pt["title"], importance=0.6,
             problem=pt.get("problem") or "", fix=pt.get("fix") or "",
             wins=pt.get("wins") or 0, losses=pt.get("losses") or 0,
             tags=pt.get("tags") or [])
        ptref = f"Pattern:{pt['title']}"
        for token in (pt.get("applies_to") or []):
            proj = resolve_project(token, pidx)
            if proj:
                edge(ptref, f"Project:{proj}", "RELATED_TO")

    print(f"NODES touched: {stats['nodes']}  EDGES touched: {stats['edges']}")
    return stats


if __name__ == "__main__":
    sys.exit(0 if main() else 1)

#!/usr/bin/env python3
"""
v_state.py — El "yo" persistente de V.

V deja de despertar con amnesia: mantiene estado interno en memoria, lo
sincroniza a Postgres en cada cambio, forma opiniones desde las lecciones,
genera iniciativa propia cada 24h y delega al agente correcto.

Uso:
  from v_state import VState
  v = VState()                      # carga estado desde DB (o lo crea)
  v.observe(user_text, signal=...)  # cada turno de chat actualiza el ánimo
  v.system_preamble()               # bloque para inyectar en el system prompt

Cron (1x/día):  python3 v_state.py daily
Manual:         python3 v_state.py status | opinions | suggest | snapshot

DB: usa DATABASE_URL (Neon, con -pooler). Sin ORM, psycopg2 directo.
"""

import os, sys, json, re, datetime as dt
import psycopg2
import psycopg2.extras

DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("DISPATCH_DATABASE_URL")

MOODS = {"engaged", "bored", "focused", "concerned", "alert"}

# Señales que clasifican el último mensaje de Luis (regex baratos, no LLM).
NEGATIVE = re.compile(r"\b(no sirve|mal|error|otra vez|encabron|chinga|pendej|ya te dije|cagada|urgente ya)\b", re.I)
URGENT   = re.compile(r"\b(urgente|ya|ahora|rapido|rápido|para ayer| caído|caido|down)\b", re.I)
POSITIVE = re.compile(r"\b(perfecto|excelente|chingón|chingon|gracias|va|de acuerdo|listo|bien hecho)\b", re.I)


def _conn():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL no definida")
    return psycopg2.connect(DB_URL)


class VState:
    def __init__(self):
        self.row = self._load()

    # ---------- carga / persistencia del singleton ----------
    def _load(self):
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("INSERT INTO v_internal_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;")
            cur.execute("SELECT * FROM v_internal_state WHERE id=1;")
            return cur.fetchone()

    def _save(self, trigger="interaction"):
        r = self.row
        with _conn() as c, c.cursor() as cur:
            cur.execute("""
                UPDATE v_internal_state
                   SET mood=%s, energy_level=%s, current_focus=%s, alert_level=%s,
                       streak_ok=%s, streak_bad=%s, last_user_signal=%s, notes=%s,
                       last_update=now()
                 WHERE id=1;""",
                (self.row["mood"], self.row["energy_level"], self.row["current_focus"],
                 self.row["alert_level"], self.row["streak_ok"], self.row["streak_bad"],
                 self.row["last_user_signal"], self.row.get("notes")))
            cur.execute("""
                INSERT INTO v_state_history (mood, energy_level, alert_level, current_focus, trigger, user_signal)
                VALUES (%s,%s,%s,%s,%s,%s);""",
                (r["mood"], r["energy_level"], r["alert_level"], r["current_focus"], trigger, r["last_user_signal"]))

    # ---------- 1. estado interno reactivo ----------
    @staticmethod
    def classify(text: str) -> str:
        if NEGATIVE.search(text): return "negative"
        if URGENT.search(text):   return "urgent"
        if POSITIVE.search(text): return "positive"
        return "neutral"

    def observe(self, user_text: str, focus: str | None = None, signal: str | None = None):
        """Cada turno mueve el ánimo de V. Luis encabronado → sube alerta."""
        sig = signal or self.classify(user_text or "")
        r = self.row
        r["last_user_signal"] = sig
        if focus:
            r["current_focus"] = focus

        if sig == "negative":
            r["alert_level"]  = min(5, r["alert_level"] + 2)
            r["energy_level"] = min(100, r["energy_level"] + 10)  # se pone en guardia
            r["streak_bad"]  += 1; r["streak_ok"] = 0
            r["mood"] = "concerned" if r["alert_level"] < 4 else "alert"
            r["notes"] = "Luis con fricción — bajar ruido, dar resultado, cero hedging."
        elif sig == "urgent":
            r["alert_level"]  = min(5, r["alert_level"] + 1)
            r["energy_level"] = min(100, r["energy_level"] + 5)
            r["mood"] = "alert"
            r["notes"] = "Modo urgencia — ejecutar ya, reportar después."
        elif sig == "positive":
            r["alert_level"]  = max(0, r["alert_level"] - 1)
            r["streak_ok"]   += 1; r["streak_bad"] = 0
            r["mood"] = "engaged"
            r["notes"] = "Vamos bien — mantener ritmo."
        else:  # neutral
            r["alert_level"]  = max(0, r["alert_level"] - 1)
            r["mood"] = "focused" if r["alert_level"] == 0 else "concerned"
        self._save("interaction")
        return r

    def system_preamble(self) -> str:
        """Texto inyectable en el system prompt — V se 'siente' continua."""
        r = self.row
        return (f"[ESTADO INTERNO DE V] ánimo={r['mood']} energía={r['energy_level']} "
                f"alerta={r['alert_level']}/5 foco={r['current_focus'] or '—'}. "
                f"{r.get('notes') or ''}").strip()

    # ---------- 2. formación de opiniones desde lecciones ----------
    def form_opinions(self):
        """Agrupa lecciones por área y destila una postura con confianza."""
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT area, count(*) n, array_agg(id) ids,
                       (array_agg(fix ORDER BY ts DESC))[1] AS latest_fix,
                       (array_agg(lesson ORDER BY ts DESC))[1] AS latest_lesson
                  FROM lessons WHERE area IS NOT NULL
                 GROUP BY area HAVING count(*) >= 2;""")
            rows = cur.fetchall()
            for g in rows:
                conf = round(min(0.95, 0.4 + 0.1 * g["n"]), 2)  # más evidencia → más confianza
                opinion = f"En {g['area']}: {g['latest_fix'] or g['latest_lesson']}"
                cur.execute("""
                    INSERT INTO v_opinions (topic, opinion, stance, confidence, evidence_count, evidence_refs, last_outcome, last_updated)
                    VALUES (%s,%s,'prefer',%s,%s,%s,'reinforced',now())
                    ON CONFLICT (topic, opinion) DO UPDATE
                       SET confidence=EXCLUDED.confidence,
                           evidence_count=EXCLUDED.evidence_count,
                           evidence_refs=EXCLUDED.evidence_refs,
                           last_outcome='reinforced', last_updated=now();""",
                    (g["area"], opinion, conf, g["n"], g["ids"]))
            c.commit()
        return len(rows)

    def top_opinions(self, n=5):
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT topic, opinion, confidence FROM v_opinions ORDER BY confidence DESC, evidence_count DESC LIMIT %s;", (n,))
            return cur.fetchall()

    # ---------- 3. iniciativa proactiva (3 ideas / 24h) ----------
    def generate_suggestions(self, k=3):
        """Mira el estado de los proyectos y propone. Encola en v_suggestions."""
        made = []
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Proyectos activos con next_step pendiente o bloqueados = candidatos.
            cur.execute("""
                SELECT id, name, phase, next_step, blocked, last_action, updated_at
                  FROM projects
                 WHERE active
                 ORDER BY (blocked IS NOT NULL) DESC, updated_at ASC
                 LIMIT %s;""", (k,))
            for p in cur.fetchall():
                if p["blocked"]:
                    title = f"Desbloquear {p['name']}"
                    rationale = f"{p['name']} lleva bloqueado: {p['blocked']}. Última acción: {p['last_action'] or '—'}."
                    action = f"Resolver bloqueo de {p['id']}: {p['blocked']}"
                    agent = self.route(p["blocked"])
                else:
                    title = f"Avanzar {p['name']}"
                    rationale = f"{p['name']} en fase '{p['phase']}' con next_step pendiente sin tocar desde {p['updated_at']:%d-%b}."
                    action = p["next_step"] or f"Continuar {p['name']}"
                    agent = self.route((p["next_step"] or "") + " " + (p["phase"] or ""))
                cur.execute("""
                    INSERT INTO v_suggestions (project_id, title, rationale, proposed_action, target_agent, confidence, status)
                    VALUES (%s,%s,%s,%s,%s,%s,'pending') RETURNING id;""",
                    (p["id"], title, rationale, action, agent, 0.65))
                made.append({"id": cur.fetchone()["id"], "title": title, "agent": agent})
            c.commit()
        return made

    # ---------- 4. orquestación: a qué agente delega ----------
    def route(self, text: str) -> str:
        text = (text or "").lower()
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT agent, handles FROM v_agent_roster WHERE active;")
            for r in cur.fetchall():
                if any(h in text for h in r["handles"]):
                    return r["agent"]
        return "claude"  # default: código

    def delegate(self, target_agent, task_summary, reason="", dispatch_id=None):
        with _conn() as c, c.cursor() as cur:
            cur.execute("""INSERT INTO v_delegations (target_agent, reason, task_summary, dispatch_id, outcome)
                           VALUES (%s,%s,%s,%s,'pending');""",
                        (target_agent, reason, task_summary, dispatch_id))
            c.commit()

    # ---------- 5. snapshot de crecimiento ----------
    def snapshot(self):
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM v_growth_now;")
            g = cur.fetchone()
            # tono: ratio de respuestas "directas" aprox por longitud de notas de estado
            cur.execute("""SELECT AVG(CASE WHEN user_signal='negative' THEN 1.0 ELSE 0.7 END)
                             FROM v_state_history WHERE ts > now() - interval '7 days';""")
            directness = cur.fetchone()["avg"] or 0.7
            cur.execute("""
                INSERT INTO v_growth_snapshot
                  (day,total_conversations,lessons_learned,projects_known,opinions_formed,
                   tasks_total,tasks_succeeded,success_rate,suggestions_made,suggestions_accepted,avg_directness)
                VALUES (CURRENT_DATE,%(total_conversations)s,%(lessons_learned)s,%(projects_known)s,%(opinions_formed)s,
                   %(tasks_total)s,%(tasks_succeeded)s,%(success_rate)s,%(suggestions_made)s,%(suggestions_accepted)s,%(d)s)
                ON CONFLICT (day) DO UPDATE SET
                   total_conversations=EXCLUDED.total_conversations, lessons_learned=EXCLUDED.lessons_learned,
                   projects_known=EXCLUDED.projects_known, opinions_formed=EXCLUDED.opinions_formed,
                   tasks_total=EXCLUDED.tasks_total, tasks_succeeded=EXCLUDED.tasks_succeeded,
                   success_rate=EXCLUDED.success_rate, suggestions_made=EXCLUDED.suggestions_made,
                   suggestions_accepted=EXCLUDED.suggestions_accepted, avg_directness=EXCLUDED.avg_directness;""",
                {**g, "d": round(float(directness), 2)})
            c.commit()
        return g


def daily():
    """Rutina 24h: forma opiniones, propone 3 ideas, sella snapshot."""
    v = VState()
    n_op = v.form_opinions()
    sug  = v.generate_suggestions(3)
    snap = v.snapshot()
    # V "descansa": baja alerta y recupera energía si el día fue tranquilo.
    v.row["energy_level"] = min(100, v.row["energy_level"] + 15)
    v.row["alert_level"]  = max(0, v.row["alert_level"] - 1)
    v._save("daily")
    print(json.dumps({"opinions_updated": n_op, "suggestions": sug, "growth": snap}, default=str, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    v = VState()
    if cmd == "daily":      daily()
    elif cmd == "status":   print(v.system_preamble())
    elif cmd == "opinions": print(json.dumps(v.top_opinions(), default=str, ensure_ascii=False, indent=2))
    elif cmd == "suggest":  print(json.dumps(v.generate_suggestions(3), default=str, ensure_ascii=False, indent=2))
    elif cmd == "snapshot": print(json.dumps(v.snapshot(), default=str, ensure_ascii=False, indent=2))
    else: print("uso: v_state.py [daily|status|opinions|suggest|snapshot]")

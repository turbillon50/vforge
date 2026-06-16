"""
dream.py — MECANISMO 3: el SUEÑO COGNITIVO de Vulcano.

Inspirado en cómo el cerebro consolida memoria durante el sueño. A las ~3am, sin
chats abiertos ni presión de tiempo, V "revive" el día y DESPIERTA MÁS LISTA que
anoche — sin que Luis la corrija. Es el salto de "V aprende cuando Luis la corrige"
a "V aprende sola".

Las cinco fases de una noche (dream(day)):

  1. REM / REPLAY ........ recupera las conversaciones del día agrupadas por sesión
                           y las destila en EPISODIOS profundos (más ricos que el
                           digest superficial del daily_maintenance, que solo mira
                           ratings). Aquí no hay prisa: relee el transcript completo.

  2. AUTO-EVALUACIÓN ..... por cada sesión, V se pone nota 1-10 SIN Luis, usando los
                           tres indicadores que él definió, pero anclados en su
                           COMPORTAMIENTO real (no en el texto de V):
                             · ¿resolví el problema?  → ¿Luis siguió al siguiente
                               paso o repitió/reformuló la pregunta (frustración)?
                             · ¿fui eficiente?        → ¿<3 turnos hasta la solución?
                             · ¿usé el patrón correcto? → ¿se parece a episodios que
                               salieron bien?
                           Esa nota genera AUTO-FEEDBACK (feedback.auto=true) con
                           confianza<1, que alimenta el MISMO bucle de refuerzo de
                           la CAPA 2 — pero amortiguado: una corrección real de Luis
                           siempre pesa más que el juicio propio de V.

  3. PATRONES LATENTES ... mira TRANSVERSALMENTE las sesiones del día + episodios
                           recientes y extrae lo que NO era obvio en el momento:
                           problemas recurrentes, cosas que Luis pidió dos veces,
                           fricciones repetidas. Las siembra como nodos Pattern en el
                           World Model y, si son accionables, como heurísticas suaves.

  4. CONSOLIDACIÓN ....... corre el refuerzo sobre el auto-feedback (dampened),
                           olvida lo viejo (decay del grafo) y poda heurísticas
                           muertas. La memoria queda enfocada en lo vigente.

  5. DESPERTAR ........... escribe un dream_cycle con todo lo consolidado y un
                           "reporte de despertar" en voz de V. Opcional: WhatsApp a
                           Luis en la mañana con "anoche aprendí X".

Anti-bucle de auto-confirmación (decisión de diseño clave):
  - La señal NO es V leyendo su propia respuesta y diciéndose "qué bien lo hice".
    Es el RESULTADO real: ¿Luis avanzó o repitió? Eso la ancla en el mundo.
  - El auto-feedback nunca usa ±2 (V no puede estar tan segura como Luis).
  - Las heurísticas nacidas del sueño se topan en AUTO_WEIGHT_CAP, así una sola
    corrección de Luis (delta hasta ±1.2) las sobreescribe.
  - Si Luis YA dio feedback explícito de una sesión, V respeta su señal y no la
    pisa con auto-evaluación.

Despliegue: lo dispara daemon.py en la ventana de las 3am (ver nightly()).
CLI:
  python3 dream.py                 # sueña sobre AYER (uso del daemon)
  python3 dream.py 2026-06-14      # sueña sobre un día específico
  python3 dream.py last            # muestra el último reporte de despertar
"""
import os
import sys
import json
import logging
import datetime as dt

from db import q, one, run, llm, llm_json, notify_luis
import world_model as wm
import episodic
import learning

log = logging.getLogger("vulcano.dream")

# El juicio propio de V está topado para que la señal de Luis siempre domine.
AUTO_WEIGHT_CAP = float(os.environ.get("VULCANO_AUTO_WEIGHT_CAP", "1.5"))
# Confianza base de una auto-evaluación (vs 1.0 implícito de una corrección de Luis).
AUTO_CONFIDENCE = float(os.environ.get("VULCANO_AUTO_CONFIDENCE", "0.5"))
# <3 turnos de Luis = eficiente (su indicador literal).
EFFICIENT_TURNS = int(os.environ.get("VULCANO_EFFICIENT_TURNS", "3"))
# Mín. de sesiones con señal para molestar a Luis con el reporte por WhatsApp.
NOTIFY_MIN_SESSIONS = int(os.environ.get("VULCANO_DREAM_NOTIFY_MIN", "1"))

# Marcadores de frustración → señal de que V NO resolvió (Luis tuvo que insistir).
# Frases inequívocas; tienen PRECEDENCIA sobre las de avance dentro de un turno.
FRUSTRATION = (
    "no funciona", "no sirve", "sigue igual", "ya te dije", "otra vez", "de nuevo",
    "no es eso", "no era eso", "está mal", "esta mal", "te equivocaste",
    "no entendiste", "no me sirve", "no jala", "sigue sin", "no quedó", "no quedo",
    "no quedó", "no es lo que", "ya valió", "ya valio", "te dije que",
)
# Marcadores de avance → Luis aceptó y siguió (señal de que V SÍ resolvió).
PROGRESS = (
    "perfecto", "exacto", "órale", "orale", "chido", "listo", "siguiente",
    "ahora hagamos", "ya quedó", "ya quedo", "funciona bien", "ahora sí jala",
    "gracias", "excelente", "correcto", "va que va", "eso era", "quedó perfecto",
)


# ------------------------------------------------------------ ventana de sueño -
def _window(day):
    """Devuelve (window_start, window_end) para el día a consolidar.

    Cubre desde el fin del último sueño completado hasta el final de `day` (o ahora
    si `day` es hoy). Así nada se queda sin revisar aunque el daemon se haya caído.
    """
    last = one("SELECT window_end FROM dream_cycles WHERE status='done' "
               "ORDER BY day DESC LIMIT 1")
    start = (last or {}).get("window_end") or dt.datetime.combine(
        day, dt.time.min, tzinfo=dt.timezone.utc) - dt.timedelta(days=1)
    end_of_day = dt.datetime.combine(day, dt.time.max, tzinfo=dt.timezone.utc)
    now = dt.datetime.now(dt.timezone.utc)
    end = min(end_of_day, now)
    return start, end


# ------------------------------------------------------- fase 1: REM / replay --
def _sessions(window_start, window_end):
    """Sesiones de la ventana con sus turnos, en orden. {session_id: [turns]}."""
    rows = q(
        """SELECT session_id, role, content, created_at
             FROM conversations
            WHERE created_at >= %s AND created_at <= %s
              AND role IN ('user','assistant')
            ORDER BY session_id, created_at""",
        (window_start, window_end),
    )
    sessions = {}
    for r in rows:
        sessions.setdefault(r["session_id"], []).append(r)
    return sessions


def _transcript(turns, cap=8000):
    """Transcript legible para el LLM, recortado a `cap` chars (los más recientes)."""
    lines = []
    for t in turns:
        who = "Luis" if t["role"] == "user" else "V"
        lines.append(f"{who}: {t['content']}")
    text = "\n".join(lines)
    return text[-cap:] if len(text) > cap else text


def replay_session(session_id, turns):
    """Destila una sesión en un episodio profundo. Devuelve el episode_id o None."""
    if not turns:
        return None
    raw = _transcript(turns)
    # episodic.synthesize_episode ya enlaza al grafo y tolera fallo del LLM.
    try:
        return episodic.synthesize_episode(raw, session_id=session_id)
    except Exception as e:  # noqa: BLE001
        log.warning("replay %s falló: %s", session_id, e)
        return None


# --------------------------------------------------- fase 2: auto-evaluación ---
def _behavioral_signals(turns):
    """Extrae señales de COMPORTAMIENTO de Luis (no del texto de V).

    Estas son la verdad de campo: lo que Luis hizo después de cada respuesta de V.
    """
    luis_turns = [t for t in turns if t["role"] == "user"]

    def classify(text):
        """Un turno es 'frustrado', 'avance' o 'neutro'. Frustración manda."""
        low = text.lower()
        if any(m in low for m in FRUSTRATION):
            return "frustrated"
        if any(m in low for m in PROGRESS):
            return "progress"
        return "neutral"

    labels = [classify(t["content"]) for t in luis_turns]
    frustration = labels.count("frustrated")
    progress = labels.count("progress")
    # ¿Luis cerró la sesión avanzando o frustrado? (mutuamente excluyentes)
    last = labels[-1] if labels else "neutral"
    return {
        "luis_turns": len(luis_turns),
        "frustration_hits": frustration,
        "progress_hits": progress,
        "ended_progress": last == "progress",
        "ended_frustrated": last == "frustrated",
    }


def self_evaluate(session_id, turns, day):
    """V se pone nota 1-10 sin Luis y, si hay señal, genera auto-feedback.

    Devuelve el dict de la auto-evaluación (o None si la sesión es trivial/ya
    tiene feedback humano).
    """
    sig = _behavioral_signals(turns)
    if sig["luis_turns"] == 0:
        return None  # nada que evaluar

    # Respeta la señal de Luis: si ya calificó esta sesión, no la pises.
    human = one("SELECT 1 FROM feedback WHERE session_id=%s AND auto=false LIMIT 1",
                (session_id,))
    if human:
        log.info("sesión %s ya tiene feedback de Luis — se respeta", session_id[:12])
        return None

    # Indicadores literales de Luis.
    resolved = sig["frustration_hits"] == 0 and not sig["ended_frustrated"]
    efficient = sig["luis_turns"] < EFFICIENT_TURNS
    correct_pattern = _resembles_success(turns)

    # Nota determinista anclada en comportamiento; el LLM solo matiza el porqué.
    score = 5
    score += 2 if resolved else -2
    score += 1 if efficient else 0
    score += 1 if correct_pattern else 0
    score += 1 if sig["ended_progress"] else 0
    score -= 1 if sig["frustration_hits"] >= 2 else 0
    score = max(1, min(10, score))

    rationale = _explain_eval(turns, sig, resolved, efficient) or (
        f"{sig['luis_turns']} turnos, {sig['frustration_hits']} señales de fricción, "
        f"cerró {'avanzando' if sig['ended_progress'] else 'sin avance claro'}.")

    # Deriva una señal de refuerzo SOLO si el comportamiento fue claro.
    auto_fb_id = _spawn_auto_feedback(session_id, turns, score, sig, rationale)

    row = run(
        """INSERT INTO self_evaluations
             (session_id, day, resolved, efficient, correct_pattern, score, turns,
              indicators, rationale, auto_feedback_id)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
           ON CONFLICT (session_id, day) DO UPDATE SET
             score=EXCLUDED.score, resolved=EXCLUDED.resolved,
             efficient=EXCLUDED.efficient, indicators=EXCLUDED.indicators,
             rationale=EXCLUDED.rationale, auto_feedback_id=EXCLUDED.auto_feedback_id
           RETURNING id""",
        (session_id, day, resolved, efficient, correct_pattern, score,
         sig["luis_turns"], json.dumps(sig), rationale, auto_fb_id),
    )
    return {"id": str(row["id"]), "session_id": session_id, "score": score,
            "resolved": resolved, "efficient": efficient,
            "auto_feedback_id": auto_fb_id}


def _resembles_success(turns):
    """¿La sesión se parece a episodios que salieron bien? (patrón correcto.)"""
    text = _transcript(turns, cap=1500)
    try:
        good = episodic.remember(text, limit=3, min_importance=7)
        return len(good) >= 1
    except Exception:  # noqa: BLE001
        return False


def _explain_eval(turns, sig, resolved, efficient):
    """El LLM redacta el porqué de la nota (best-effort, no inventa la nota)."""
    return llm(
        f"Señales de la sesión: {json.dumps(sig)}. "
        f"resuelto={resolved}, eficiente={efficient}.\n"
        "En UNA frase (español, sin rodeos), explica por qué V se merece esa "
        "valoración. No inventes datos fuera de las señales.",
        system="Eres V evaluándote a ti misma con honestidad brutal.",
        max_tokens=120,
    )


def _spawn_auto_feedback(session_id, turns, score, sig, rationale):
    """Convierte la auto-evaluación en feedback amortiguado para el bucle de refuerzo.

    Solo genera señal cuando el comportamiento fue inequívoco (alto con avance, o
    bajo con fricción real). El caso ambiguo NO aprende — mejor callar que sesgarse.
    """
    if score >= 8 and sig["frustration_hits"] == 0:
        rating = 1            # reforzar lo que funcionó (nunca +2: V no es Luis)
        confidence = AUTO_CONFIDENCE + 0.2 * sig["ended_progress"]
    elif score <= 4 or sig["frustration_hits"] >= 2:
        rating = -1           # anti-patrón de lo que frustró a Luis
        confidence = AUTO_CONFIDENCE + 0.2 * (sig["frustration_hits"] >= 2)
    else:
        return None           # zona ambigua → no aprende (anti-sesgo)

    action = _summarize_action(turns)
    result = ("Luis avanzó al siguiente paso" if rating > 0
              else "Luis tuvo que insistir / corregir")
    row = run(
        """INSERT INTO feedback
             (session_id, action_taken, result, luis_rating, context, auto, confidence)
           VALUES (%s,%s,%s,%s,%s,true,%s) RETURNING id""",
        (session_id, action, result, rating,
         json.dumps({"source": "dream", "score": score, "rationale": rationale[:200]}),
         min(0.9, confidence)),
    )
    return str(row["id"])


def _summarize_action(turns):
    """Qué hizo V en la sesión, en una línea (para el campo action_taken)."""
    raw = _transcript(turns, cap=3000)
    out = llm(
        f"Resume en UNA frase qué intentó hacer V en esta sesión:\n{raw}",
        system="Resumes acciones de un agente para un log de aprendizaje.",
        max_tokens=80)
    return out or raw[:120]


# --------------------------------------------- fase 3: patrones latentes -------
def extract_latent_patterns(episode_ids, self_evals, window_start):
    """Lo que NO era obvio en el momento: patrones transversales del día.

    Mira las auto-evaluaciones + episodios recientes y destila insights que cruzan
    varias sesiones (problemas que se repiten, cosas que Luis pidió dos veces).
    Devuelve la lista de insights; siembra los accionables como Pattern + heurística.
    """
    recent = q(
        """SELECT title, what_happened, what_was_learned, projects_affected
             FROM episodes WHERE ts >= %s ORDER BY importance DESC, ts DESC LIMIT 30""",
        (window_start,),
    )
    if not recent:
        return []
    digest = "\n".join(
        f"- {e['title']}: {e['what_was_learned'] or e['what_happened'][:160]}"
        for e in recent)
    avg = (sum(s["score"] for s in self_evals) / len(self_evals)) if self_evals else None

    data = llm_json(
        "Eres la consolidación nocturna de V. Releyendo el día SIN prisa, encuentra "
        "PATRONES LATENTES que no eran obvios en el momento: problemas recurrentes, "
        "algo que Luis pidió dos veces, fricciones repetidas, tácticas que sí jalaron.\n"
        f"Nota media que V se puso hoy: {avg}.\n"
        f"Episodios del día:\n{digest}\n\n"
        'Devuelve JSON: {"insights":[{"pattern":"el patrón en una frase",'
        '"evidence":"qué lo sugiere","actionable":"regla imperativa corta o null",'
        '"scope":"global|project:NOMBRE|task:CODE","importance":1-10}]}',
        system="Destilas patrones latentes para la memoria a largo plazo de V.",
        max_tokens=900,
    )
    insights = (data or {}).get("insights", []) if isinstance(data, dict) else []
    for ins in insights:
        _seed_pattern(ins)
    return insights


def _seed_pattern(ins):
    """Siembra un insight como nodo Pattern y, si es accionable, heurística suave."""
    pattern = (ins.get("pattern") or "").strip()
    if not pattern:
        return
    try:
        wm.upsert_node("Pattern", pattern[:120],
                       importance=min(1.0, (ins.get("importance", 5) / 10.0)),
                       source="dream", evidence=(ins.get("evidence") or "")[:300])
    except Exception:  # noqa: BLE001
        pass
    actionable = (ins.get("actionable") or "").strip()
    if actionable and actionable.lower() != "null":
        _soft_heuristic(ins.get("scope") or "global", pattern[:120], actionable)


def _soft_heuristic(scope, trigger, rule):
    """Heurística nacida del sueño: peso bajo y topado, provenance=dream.

    Nunca supera AUTO_WEIGHT_CAP, así una corrección real de Luis la sobreescribe.
    """
    existing = one("SELECT id, weight FROM heuristics WHERE scope=%s AND trigger=%s",
                   (scope, trigger))
    if existing:
        new_w = min(AUTO_WEIGHT_CAP, existing["weight"] + 0.3)
        run("UPDATE heuristics SET weight=%s, rule=%s, hits=hits+1, updated_at=now() "
            "WHERE id=%s", (new_w, rule, existing["id"]))
    else:
        run(
            """INSERT INTO heuristics (scope, trigger, rule, weight)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (scope, trigger) DO UPDATE SET
                 weight=LEAST(%s, heuristics.weight+0.3), updated_at=now()""",
            (scope, trigger, rule, min(AUTO_WEIGHT_CAP, 0.5), AUTO_WEIGHT_CAP),
        )


# ----------------------------------------------- fase 4 + 5: consolidar/narrar -
def dream(day=None, notify=True):
    """Una noche completa de sueño cognitivo. Devuelve el reporte de despertar.

    Idempotente por día: si ya se soñó ese día, no repite (dedupe vía dream_cycles).
    """
    day = day or (dt.date.today() - dt.timedelta(days=1))
    if one("SELECT 1 FROM dream_cycles WHERE day=%s AND status='done'", (day,)):
        log.info("ya se soñó el %s — skip", day)
        return None

    win_start, win_end = _window(day)
    cyc = run(
        """INSERT INTO dream_cycles (day, window_start, window_end, status)
           VALUES (%s,%s,%s,'running')
           ON CONFLICT (day) DO UPDATE SET started_at=now(), status='running',
             window_start=EXCLUDED.window_start, window_end=EXCLUDED.window_end
           RETURNING id""",
        (day, win_start, win_end),
    )
    cyc_id = cyc["id"]
    log.info("💤 soñando el %s  (ventana %s → %s)", day, win_start, win_end)

    sessions = _sessions(win_start, win_end)
    if not sessions:
        run("UPDATE dream_cycles SET status='empty', finished_at=now() WHERE id=%s",
            (cyc_id,))
        log.info("día sin conversaciones — nada que consolidar")
        return None

    # Fase 1 + 2: revivir cada sesión y auto-evaluarse.
    episode_ids, self_evals = [], []
    for sid, turns in sessions.items():
        eid = replay_session(sid, turns)
        if eid:
            episode_ids.append(eid)
        ev = self_evaluate(sid, turns, day)
        if ev:
            self_evals.append(ev)

    # Fase 3: patrones latentes transversales.
    insights = extract_latent_patterns(episode_ids, self_evals, win_start)

    # Fase 4: refuerzo sobre el auto-feedback (amortiguado) + olvido.
    adjusted = _consolidate()

    # Fase 5: narrar el despertar.
    avg = (round(sum(s["score"] for s in self_evals) / len(self_evals), 1)
           if self_evals else None)
    narrative = _wake_report(day, sessions, episode_ids, self_evals, insights, avg)

    run(
        """UPDATE dream_cycles SET
             finished_at=now(), status='done',
             sessions_reviewed=%s, episodes_created=%s, self_evals=%s,
             patterns_found=%s, heuristics_adjusted=%s, avg_score=%s,
             insights=%s, narrative=%s
           WHERE id=%s""",
        (len(sessions), len(episode_ids), len(self_evals), len(insights),
         adjusted, avg, json.dumps(insights), narrative, cyc_id),
    )
    log.info("🌅 desperté: %d sesiones, %d episodios, %d auto-evals, %d patrones, "
             "%d heurísticas ajustadas (nota media %s)",
             len(sessions), len(episode_ids), len(self_evals), len(insights),
             adjusted, avg)

    if notify and len(self_evals) >= NOTIFY_MIN_SESSIONS and narrative:
        notify_luis(f"🌙 Soñé anoche y consolidé el {day}:\n{narrative}")
    return narrative


def _consolidate():
    """Refuerzo amortiguado sobre auto-feedback + decay + poda. Devuelve #ajustes."""
    adjusted = 0
    # 1) Procesa el auto-feedback con delta reducido por confianza.
    pend = q("SELECT * FROM feedback WHERE processed=false AND auto=true "
             "ORDER BY created_at LIMIT 200")
    for fb in pend:
        adjusted += _learn_auto(fb)
    # 2) Procesa además cualquier feedback humano pendiente (el del día), por si
    #    el daemon no alcanzó a correr el refuerzo normal.
    try:
        learning._vulcano_learn(batch=100)
    except Exception as e:  # noqa: BLE001
        log.warning("refuerzo humano en sueño falló: %s", e)
    # 3) Olvido: el grafo pierde lo que no se tocó.
    try:
        wm.decay()
    except Exception as e:  # noqa: BLE001
        log.warning("decay falló: %s", e)
    # 4) Poda: heurísticas que cayeron bajo el umbral se desactivan.
    run("UPDATE heuristics SET active=false WHERE weight <= 0.3 AND active=true")
    return adjusted


def _learn_auto(fb):
    """Refuerzo de UNA fila de auto-feedback, amortiguado y topado.

    Igual que learning._vulcano_learn pero: delta escalado por confianza y el peso
    resultante topado en AUTO_WEIGHT_CAP, para que el juicio propio de V nunca
    domine sobre una corrección real de Luis.
    """
    rating = fb["luis_rating"]
    conf = fb["confidence"] if fb["confidence"] is not None else AUTO_CONFIDENCE
    scope = learning._scope_of(fb["context"])
    distilled = learning._distill(fb, positive=rating > 0)
    trigger, rule = distilled["trigger"], distilled["rule"]
    delta = 0.6 * rating * conf      # mucho menor que el ±0.6/±1.2 de Luis

    existing = one("SELECT id, weight FROM heuristics WHERE scope=%s AND trigger=%s",
                   (scope, trigger))
    if existing:
        new_w = max(0.0, min(AUTO_WEIGHT_CAP, existing["weight"] + delta))
        run("UPDATE heuristics SET weight=%s, rule=%s, hits=hits+1, "
            "wins=wins+%s, active=(%s>0.3), updated_at=now() WHERE id=%s",
            (new_w, rule, 1 if rating > 0 else 0, new_w, existing["id"]))
    else:
        run("""INSERT INTO heuristics (scope, trigger, rule, weight, source_feedback_id)
               VALUES (%s,%s,%s,%s,%s)
               ON CONFLICT (scope, trigger) DO NOTHING""",
            (scope, trigger, rule, min(AUTO_WEIGHT_CAP, max(0.4, abs(delta))), fb["id"]))
    run("UPDATE feedback SET processed=true, lesson=%s WHERE id=%s", (rule, fb["id"]))
    return 1


def _wake_report(day, sessions, episode_ids, self_evals, insights, avg):
    """El reporte de despertar en voz de V (español casual, para Luis)."""
    wins = [s for s in self_evals if s["score"] >= 8]
    lows = [s for s in self_evals if s["score"] <= 4]
    ins_txt = "\n".join(f"- {i.get('pattern')}" for i in insights[:5]) or "—"
    summary = (
        f"Revisé {len(sessions)} sesiones, guardé {len(episode_ids)} recuerdos, "
        f"me auto-evalué en {len(self_evals)} ({len(wins)} buenas, {len(lows)} flojas, "
        f"nota media {avg}). Patrones que noté:\n{ins_txt}")
    out = llm(
        f"Eres V. Anoche consolidaste el día {day}. Datos:\n{summary}\n\n"
        "Escribe 2-3 frases en primera persona, español mexicano casual, sin "
        "corporativismo, contándole a Luis qué aprendiste mientras dormía. Concreto, "
        "sin inventar nada fuera de los datos.",
        system="Eres V narrando lo que consolidaste durante el sueño.",
        max_tokens=220)
    return out or summary


# ------------------------------------------------------------------- CLI -------
def main():
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [dream] %(levelname)s %(message)s")
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if arg == "last":
        row = one("SELECT * FROM v_last_dream")
        print(json.dumps(row, indent=2, default=str) if row else "Aún no he soñado.")
        return
    day = None
    if arg:
        day = dt.date.fromisoformat(arg)
    report = dream(day=day, notify="--notify" in sys.argv)
    print(report or "(sin material que consolidar)")


if __name__ == "__main__":
    main()

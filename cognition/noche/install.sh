#!/usr/bin/env bash
# Instala el Protocolo de Noche de Vulcano en el crontab (idempotente).
# Re-corre las veces que quieras: borra su bloque viejo y lo vuelve a poner.
set -euo pipefail

DIR="/root/agents/noche"
PY="/usr/bin/python3"
LOG="$DIR/noche.log"
BEGIN="# ── BEGIN Protocolo de Noche Vulcano ──"
END="# ── END Protocolo de Noche Vulcano ──"

echo "==> Instalando Protocolo de Noche en $DIR"
mkdir -p "$DIR/state"
touch "$LOG"

# 1) Parchear v_morning para que use el briefing nocturno a las 7am
$PY "$DIR/patch_v_morning.py" || echo "WARN: patch v_morning no aplicó"

# 2) Reescribir el bloque del crontab de forma idempotente
TMP="$(mktemp)"
# conserva todo lo que NO sea nuestro bloque
crontab -l 2>/dev/null | sed "/$BEGIN/,/$END/d" > "$TMP" || true

cat >> "$TMP" <<EOF
$BEGIN
0  2 * * * cd $DIR && HOME=/root $PY s1_session.py >> $LOG 2>&1
30 2 * * * cd $DIR && HOME=/root $PY s2_memory.py  >> $LOG 2>&1
0  3 * * * cd $DIR && HOME=/root $PY s3_dream.py   >> $LOG 2>&1
0  4 * * * cd $DIR && HOME=/root $PY s4_build.py   >> $LOG 2>&1
30 6 * * * cd $DIR && HOME=/root $PY s5_prep.py    >> $LOG 2>&1
# 07:00 lo manda v_morning.py (ya en cron) usando briefing_latest.md
$END
EOF

crontab "$TMP"
rm -f "$TMP"

echo "==> Crontab actualizado. Bloque nocturno:"
crontab -l | sed -n "/$BEGIN/,/$END/p"
echo "==> Listo."

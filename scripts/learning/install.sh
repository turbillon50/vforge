#!/usr/bin/env bash
# install.sh — instala el protocolo de aprendizaje de Vulcano en el server.
# Idempotente: corre cuantas veces quieras.
set -e
DIR="/root/agents/learning"

echo "→ migración de esquema (aditiva)"
python3 "$DIR/run.py" migrate

echo "→ instalando cron"
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v "agents/learning/run.py" > "$CRON_TMP" || true
cat >> "$CRON_TMP" <<EOF
# ── Vulcano Learning Protocol ──
*/20 * * * * cd $DIR && python3 run.py auto    >> $DIR/learning.log 2>&1
15  *  * * * cd $DIR && python3 run.py contrast >> $DIR/learning.log 2>&1
0   3  * * * cd $DIR && python3 run.py night    >> $DIR/learning.log 2>&1
EOF
crontab "$CRON_TMP"
rm -f "$CRON_TMP"

echo "✓ instalado. Cron activo:"
crontab -l | grep learning
echo "→ estado:"
python3 "$DIR/run.py" status

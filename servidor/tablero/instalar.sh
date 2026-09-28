#!/bin/bash
# Instala el colector del tablero en el Hetzner desde el repo.
# Idempotente: correrlo dos veces no duplica el cron.
#   cd /ruta/al/clon/vforge && ./servidor/tablero/instalar.sh
set -euo pipefail

FUENTE="$(cd "$(dirname "$0")" && pwd)/estado.py"
DESTINO=/usr/local/sbin/vl-tablero
DATOS=/root/tablero
LINEA="*/5 * * * * $DESTINO >/dev/null 2>&1"

[ -f "$FUENTE" ] || { echo "no encuentro $FUENTE"; exit 1; }
python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$FUENTE"

install -m 755 "$FUENTE" "$DESTINO"
mkdir -p "$DATOS"

# fuera la línea vieja y las duplicadas. La vieja era
# `cd /root/tablero && python3 estado.py`: el patrón tiene que cubrir esa forma,
# no solo la ruta junta.
ACTUAL="$(crontab -l 2>/dev/null || true)"
NUEVO="$(printf '%s\n' "$ACTUAL" | grep -vE '/root/tablero.*estado\.py|vl-tablero' || true)"
printf '%s\n%s\n' "$NUEVO" "$LINEA" | grep -v '^$' | crontab -

echo "instalado:  $DESTINO"
echo "cron:       $(crontab -l | grep vl-tablero)"
echo "salida:     $DATOS/estado.json"
echo
echo "primera corrida (reconstruye la caché de tokens, ~8 s):"
"$DESTINO" >/dev/null && echo "  ok · $(stat -c%s $DATOS/estado.json) bytes · $(date -u +%H:%M:%SZ)"

#!/bin/bash
# Instala el mando del tablero en el Hetzner desde el repo.
#   cd /ruta/al/clon/vforge && ./servidor/instalar-control.sh
set -euo pipefail

FUENTE="$(cd "$(dirname "$0")" && pwd)/vl-control"
DESTINO=/usr/local/sbin/vl-control

[ -f "$FUENTE" ] || { echo "no encuentro $FUENTE"; exit 1; }
python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$FUENTE"
install -m 755 "$FUENTE" "$DESTINO"

echo "instalado: $DESTINO"
echo "verbos:    pausar · reanudar · detener · relanzar"
echo
echo "prueba en seco (un tag que no existe: debe rechazar sin tocar nada):"
"$DESTINO" pausar no-existe-este-frente || true

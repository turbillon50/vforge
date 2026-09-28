#!/usr/bin/env bash
# Banco de paneles: arma, levanta, prueba en WebKit y apaga. Un solo comando.
#
#   bash servicios/vivo/qa/banco/correr.sh
#
# Necesita el servicio vf-vivo encendido (es contra el motor de verdad) y la
# llave en /etc/vl-secrets/vivo.env. Deja las capturas en capturas/vivo/.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PUERTO="${BANCO_PUERTO:-9345}"
cd "$RAIZ"

export NVM_DIR=/root/.nvm
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" >/dev/null
nvm use 20 >/dev/null

echo "· tsc → CommonJS"
./node_modules/.bin/tsc -p servicios/vivo/qa/banco/tsconfig.banco.json

echo "· empacando para el navegador"
node servicios/vivo/qa/banco/empacar.mjs

echo "· CSS con el Tailwind del proyecto"
./node_modules/.bin/tailwindcss -c tailwind.config.ts -i app/globals.css \
  -o servicios/vivo/qa/banco/publico/banco.css \
  --content "./components/studio/vivo/*.tsx,./servicios/vivo/qa/banco/entrada.tsx" 2>/dev/null

echo "· levantando el banco en :$PUERTO"
node servicios/vivo/qa/banco/servidor.mjs "$PUERTO" > /tmp/banco-servidor.log 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:$PUERTO/" && break
  sleep 0.3
done

echo "· WebKit"
BANCO_URL="http://127.0.0.1:$PUERTO" node servicios/vivo/qa/banco/prueba-paneles.mjs

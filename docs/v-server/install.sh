#!/usr/bin/env bash
# install.sh — instala dependencias de api.py v2 en el Hetzner.
# Se ejecuta una sola vez (idempotente — se puede correr de nuevo sin
# problemas, apt/pip detectan lo ya instalado y skipean).
#
# Uso (manual desde SSH):
#   bash install.sh
#
# Uso (vía V con remote_execution): ver README.md "Opción A".

set -euo pipefail

echo "==> Instalando deps del sistema (Playwright las necesita)..."
apt-get update -y
apt-get install -y python3-venv python3-pip curl

echo "==> Activando venv en /home/v-server/venv..."
cd /home/v-server
if [ ! -d venv ]; then
    python3 -m venv venv
fi
# shellcheck source=/dev/null
source venv/bin/activate

echo "==> Instalando paquetes Python..."
pip install --upgrade pip
pip install flask paramiko playwright requests

echo "==> Bajando Chromium para Playwright..."
playwright install chromium
playwright install-deps chromium || true   # algunas libs del sistema fallan en headless minimal, no es bloqueante

echo "==> Listo. Sustituye api.py por la versión nueva y reinicia v-server."
echo "    systemctl restart v-server"

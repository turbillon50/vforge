#!/usr/bin/env bash
# Instala/actualiza vf-vivo en el Hetzner. Idempotente: se puede correr de nuevo
# después de un barrido porque todo lo que necesita está en GitHub.
#
#   bash servicios/vivo/instalar.sh
#
# El secreto NO se genera aquí si ya existe: /etc/vl-secrets/vivo.env se respeta.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESTINO=/opt/vf-vivo
IP=178.105.135.26
HOSTS=(vivo1 vivo2 vivo3)
NODE_BIN=/root/.nvm/versions/node/v20.20.2/bin/node

echo "==> 1. Código a ${DESTINO}"
mkdir -p "$DESTINO/editor"
install -m 0755 "$AQUI/vivo.mjs" "$DESTINO/vivo.mjs"
install -m 0644 "$AQUI/editor/aplicar-edicion.mjs" "$DESTINO/editor/aplicar-edicion.mjs"
install -m 0644 "$AQUI/editor/overlay.js" "$DESTINO/editor/overlay.js"
install -m 0644 "$AQUI/editor/vf-src-loader.cjs" "$DESTINO/editor/vf-src-loader.cjs"
install -m 0644 "$AQUI/editor/vf-vivo-next.cjs" "$DESTINO/editor/vf-vivo-next.cjs"
# El registro no se sobreescribe si ya fue editado en el servidor.
if [ ! -f "$DESTINO/proyectos.json" ]; then
  install -m 0644 "$AQUI/proyectos.json" "$DESTINO/proyectos.json"
  echo "    registro nuevo instalado"
else
  echo "    registro ya existía, se respeta (compáralo a mano si cambió el repo)"
fi

echo "==> 2. Secreto"
if [ ! -f /etc/vl-secrets/vivo.env ]; then
  mkdir -p /etc/vl-secrets
  SECRETO="$("$NODE_BIN" -e 'process.stdout.write(require("crypto").randomBytes(48).toString("base64url"))')"
  cat > /etc/vl-secrets/vivo.env <<EOF
VIVO_SECRET=${SECRETO}
VIVO_PORT=9311
VIVO_MAX_SLOTS=3
VIVO_IDLE_MS=1200000
VIVO_MEM_MB=1536
VIVO_REGISTRY=${DESTINO}/proyectos.json
VIVO_BASE_HOST=${IP}.sslip.io
EOF
  chmod 600 /etc/vl-secrets/vivo.env
  echo "    secreto generado (600). Súbelo a Vercel como VF_VIVO_SECRET."
else
  echo "    /etc/vl-secrets/vivo.env ya existe, se respeta"
fi

echo "==> 3. Certificados"
FALTAN=0
for h in "${HOSTS[@]}"; do
  [ -d "/etc/letsencrypt/live/${h}.${IP}.sslip.io" ] || FALTAN=1
done

if [ "$FALTAN" = "0" ]; then
  echo "    los 3 certificados ya existen"
else
# Huevo y gallina: la config final referencia certificados que todavía no existen,
# así que primero se levanta un vhost de puerto 80 que sólo sirve el reto ACME.
mkdir -p /var/www/html
cat > /etc/nginx/sites-available/vf-vivo-acme <<EOF
server {
  listen 80;
  server_name ${HOSTS[0]}.${IP}.sslip.io ${HOSTS[1]}.${IP}.sslip.io ${HOSTS[2]}.${IP}.sslip.io;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 404; }
}
EOF
ln -sfn /etc/nginx/sites-available/vf-vivo-acme /etc/nginx/sites-enabled/vf-vivo-acme
nginx -t && systemctl reload nginx

for h in "${HOSTS[@]}"; do
  DOM="${h}.${IP}.sslip.io"
  if [ -d "/etc/letsencrypt/live/${DOM}" ]; then
    echo "    ${DOM} ya tiene certificado"
  else
    echo "    pidiendo certificado para ${DOM}"
    certbot certonly --webroot -w /var/www/html -d "$DOM" \
      --non-interactive --agree-tos -m turbillon50@gmail.com || {
      echo "    !! falló el certificado de ${DOM} — revísalo antes de seguir"; exit 1; }
  fi
done

# Ya con los certificados, el vhost de ACME sale: la config final trae su propio puerto 80.
rm -f /etc/nginx/sites-enabled/vf-vivo-acme
fi

echo "==> 4. nginx"
mkdir -p /etc/nginx/snippets
install -m 0644 "$AQUI/vivo-proxy.conf" /etc/nginx/snippets/vivo-proxy.conf
install -m 0644 "$AQUI/nginx-vivo.conf" /etc/nginx/sites-available/vf-vivo
ln -sfn /etc/nginx/sites-available/vf-vivo /etc/nginx/sites-enabled/vf-vivo
nginx -t
systemctl reload nginx
echo "    nginx recargado"

echo "==> 5. systemd"
install -m 0644 "$AQUI/vf-vivo.service" /etc/systemd/system/vf-vivo.service
systemctl daemon-reload
systemctl enable vf-vivo >/dev/null 2>&1 || true
systemctl restart vf-vivo
sleep 2
systemctl is-active vf-vivo

echo "==> 6. Capa de edición en cada worktree registrado"
# El loader vive junto al proyecto para que su webpack lo pueda resolver.
"$NODE_BIN" -e '
const {readFileSync}=require("fs");
const reg=JSON.parse(readFileSync(process.argv[1],"utf8"));
for(const [n,c] of Object.entries(reg.proyectos||{})) console.log(`${n}\t${c.worktree||""}`);
' "$DESTINO/proyectos.json" | while IFS=$'\t' read -r NOMBRE WT; do
  [ -z "$WT" ] && continue
  if [ ! -d "$WT" ]; then echo "    $NOMBRE: worktree ausente ($WT) — se salta"; continue; fi
  mkdir -p "$WT/.vf-vivo"
  install -m 0644 "$AQUI/editor/vf-src-loader.cjs" "$WT/.vf-vivo/vf-src-loader.cjs"
  install -m 0644 "$AQUI/editor/vf-vivo-next.cjs" "$WT/.vf-vivo/vf-vivo-next.cjs"
  echo "    $NOMBRE: capa instalada en $WT/.vf-vivo"
done

echo "==> 7. Salud"
curl -fsS http://127.0.0.1:9311/__vivo/health && echo
echo "Listo. Hosts: ${HOSTS[*]/#/} en ${IP}.sslip.io"

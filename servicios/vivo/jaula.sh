#!/usr/bin/env bash
# jaula.sh — corre un comando ENCERRADO en el worktree de un proyecto vivo.
#
#   jaula.sh <worktree> <comando> [args...]
#
# Para qué: el código de un proyecto (su dev server) y los agentes que le hacen
# encargos NO deben ver el resto del servidor. Dentro de la jaula:
#   - todo el disco es de solo lectura, y /root, /home, /opt, /etc/vl-secrets,
#     /run (socket de docker), /var/lib/docker y /var/log ni siquiera existen;
#   - lo único escribible es el worktree del proyecto (su .git queda de solo
#     lectura: nadie planta hooks que luego corra root) y un HOME desechable;
#   - sin capacidades de root (--cap-drop ALL), PID/IPC propios, env limpio.
# La red sí queda (el dev server y el agente la necesitan).
#
# Variables que pasan adentro: sólo las nombradas en JAULA_VARS (separadas por
# espacio). Todo lo demás del entorno del que llama se queda afuera.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "uso: jaula.sh <worktree> <comando> [args...]" >&2
  exit 64
fi

WT=$(realpath -e "$1")
shift
case "$WT" in
  /root/worktrees/vivo-*) ;;
  *) echo "jaula: el worktree tiene que vivir en /root/worktrees/vivo-*" >&2; exit 64 ;;
esac
[ -d "$WT/.git" ] || { echo "jaula: $WT no es un repo" >&2; exit 64; }

NODEBIN=${VIVO_NODE_BIN:-/root/.nvm/versions/node/v20.20.2/bin}
NVM_RAIZ=$(dirname "$(dirname "$(dirname "$NODEBIN")")")   # …/.nvm/versions → …/.nvm
NVM_RAIZ=$(dirname "$NVM_RAIZ")

HOGAR=$(mktemp -d /tmp/jaula-hogar.XXXXXX)
limpiar() { python3 -c 'import shutil,sys; shutil.rmtree(sys.argv[1], ignore_errors=True)' "$HOGAR"; }
trap limpiar EXIT

args=(
  --ro-bind / /
  --dev /dev
  --proc /proc
  --tmpfs /root
  --tmpfs /home
  --tmpfs /opt
  --tmpfs /etc/vl-secrets
  --tmpfs /var/lib/docker
  --tmpfs /var/log
  --tmpfs /run
  --tmpfs /tmp
  --ro-bind /dev/null /etc/shadow
  --ro-bind "$NVM_RAIZ" "$NVM_RAIZ"
  --bind "$WT" "$WT"
  --ro-bind "$WT/.git" "$WT/.git"
  --bind "$HOGAR" /tmp/hogar
  --chdir "$WT"
  --unshare-pid
  --unshare-ipc
  --unshare-uts
  --unshare-cgroup-try
  --cap-drop ALL
  --new-session
  --die-with-parent
  --clearenv
  --setenv HOME /tmp/hogar
  --setenv PATH "$NODEBIN:/usr/local/bin:/usr/bin:/bin"
  --setenv LANG C.UTF-8
)

# DNS: resolv.conf suele apuntar a /run/systemd/resolve; se deja sólo eso.
if [ -d /run/systemd/resolve ]; then
  args+=(--ro-bind /run/systemd/resolve /run/systemd/resolve)
fi

for v in ${JAULA_VARS:-}; do
  if [ -n "${!v+x}" ]; then
    args+=(--setenv "$v" "${!v}")
  fi
done

# Sin exec: el trap tiene que correr para borrar el HOME desechable.
set +e
bwrap "${args[@]}" -- "$@"
codigo=$?
exit $codigo

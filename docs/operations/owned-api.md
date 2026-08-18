# VForge owned API

VForge mantiene su plano de datos en infraestructura propia. Vercel funciona
como frontend/BFF reemplazable; el navegador nunca recibe credenciales de
infraestructura ni se conecta directamente a Neon o MetaMCP.

## Topología actual

- API pública: `https://api.vforge.site`
- Proceso: `vforge-api.service`
- Listener interno: `127.0.0.1:3110`
- Reverse proxy y TLS: Nginx + Let's Encrypt
- Fuente: `services/vforge-api/server.mjs`
- Configuración privada: `/etc/vforge/vforge-api.env`
- Token interno: `/etc/vforge/vforge-api.token`

Los archivos bajo `/etc/vforge` deben permanecer fuera de Git y con permisos
restrictivos. Nunca copies valores de esas rutas a logs, tickets o documentos.

## Contrato v1

Todas las rutas de proyecto exigen `Authorization: Bearer …` y una identidad
confiable en `X-VForge-User-Id`, `X-VForge-User-Email` y, opcionalmente,
`X-VForge-User-Name`. La API vuelve a resolver el rol en Neon; no confía en un
rol enviado por el BFF.

- `GET /api/v1/health`
- `GET /api/v1/projects/:projectId/live`
- `GET /api/v1/projects/:projectId/events?since=<ISO>`
- `GET /api/v1/projects/:projectId/events/stream?since=<ISO>`
- `GET /api/v1/projects/:projectId/comments`
- `POST /api/v1/projects/:projectId/comments`

El stream usa SSE. Nginx mantiene desactivado el buffering para este host. Los
comentarios crean un evento `comment.created`, de modo que los miembros activos
ven la actividad sin recargar la página.

## Límite de confianza

- Vercel guarda `VFORGE_API_ORIGIN` y `VFORGE_API_INTERNAL_TOKEN` solo en el
  entorno necesario.
- Clerk se resuelve en el BFF de Next.js; Hetzner vuelve a validar membresía,
  estado, expiración y proyecto.
- `observer` no recibe `admin_url`; `reviewer` y `owner` sí.
- Las consultas siempre incluyen `project_id`.
- No hay CORS público en la API.
- Un namespace de cliente nunca debe recibir executor, Neon, Mesh o Brain.

## Verificación operativa

Antes de reiniciar:

```bash
cd /root/worktrees/codex-vforge-owned-api
export PATH=/root/.nvm/versions/node/v20.20.2/bin:$PATH
node --check services/vforge-api/server.mjs
npm run typecheck
npm test
```

Después de actualizar la rama aislada:

```bash
systemctl restart vforge-api
systemctl is-active vforge-api
curl --fail-with-body https://api.vforge.site/api/v1/health
```

La salud pública debe responder `status=ok` y `database=ok`. Una ruta de
proyecto sin bearer token debe responder `401`. Las pruebas autenticadas deben
leer el token desde el archivo protegido; nunca lo pegues en la línea de
comandos, documentación o salida de CI.

## MetaMCP

La IP y los puertos internos de MetaMCP son detalles del plano de control. El
frontend habla únicamente con endpoints de VForge de alcance limitado. La API
no debe convertirse en un proxy genérico hacia MetaMCP ni exponer herramientas
de operador a invitados o clientes.

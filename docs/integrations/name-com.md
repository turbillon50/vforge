# Integración: Name.com (registrar + DNS)

> *Conexión de un dominio comprado en Name.com a un proyecto Vercel. Runbook ejecutado por Claude Code (Fase 7 del playbook). Una vez Forge AI esté funcional (M5+), este runbook se ejecuta autónomamente.*

---

## Resumen

- **Provider:** [Name.com](https://www.name.com) — registrar + DNS managed
- **Hosting destino:** Vercel
- **Estrategia DNS:** A record en apex + CNAME en `www` (no se cambian nameservers)
- **SSL:** automático vía Let's Encrypt cuando el dominio se registra en Vercel
- **Implementado en:** vForge MVP (`vforge.site`) · 2026-05-02

---

## Inputs requeridos del operador

```
NAME_USERNAME   email de la cuenta (ej. luis@allglobal.ec)
NAME_TOKEN      API token generado en https://www.name.com/account/settings/api
DOMAIN          dominio comprado (ej. vforge.site)
```

Vercel project ya debe existir y tener un proyecto válido con `PROJECT_ID` y `TEAM_ID` accesibles.

## Endpoints usados

### Name.com API v4 (auth: HTTP Basic con `username:token`)

| Endpoint | Método | Para qué |
|---|---|---|
| `/v4/hello` | GET | Verificar credenciales |
| `/v4/domains/{domain}` | GET | Confirmar que el dominio está en la cuenta |
| `/v4/domains/{domain}/records` | GET | Listar DNS records existentes |
| `/v4/domains/{domain}/records` | POST | Crear A / CNAME records |
| `/v4/domains/{domain}/records/{id}` | DELETE | Borrar record (cleanup si hace falta) |

### Vercel API (auth: `Authorization: Bearer <token>`)

| Endpoint | Método | Para qué |
|---|---|---|
| `/v9/projects/{id}/domains?teamId={team}` | GET | Listar dominios actuales |
| `/v10/projects/{id}/domains?teamId={team}` | POST | Registrar nuevo dominio |
| `/v9/projects/{id}/env?teamId={team}` | GET | Encontrar id del env var a actualizar |
| `/v9/projects/{id}/env/{envId}?teamId={team}` | PATCH | Actualizar `NEXT_PUBLIC_SITE_URL` |
| `/v13/deployments?teamId={team}&forceNew=1` | POST | Trigger redeploy con `gitSource` |

---

## Runbook ejecutado

### Paso 1 — Stash de credenciales

```bash
umask 077
cat > /tmp/.env-deploys <<EOF
export NAME_TOKEN='...'
export NAME_USERNAME='turbillon50@gmail.com'
export DOMAIN='vforge.site'
export VERCEL_TOKEN='...'
export VERCEL_TEAM_ID='team_...'
export PROJECT_ID='prj_...'
EOF
chmod 600 /tmp/.env-deploys
```

### Paso 2 — Verificar auth y dominio

```bash
curl -s -u "$NAME_USERNAME:$NAME_TOKEN" "https://api.name.com/v4/hello"
curl -s -u "$NAME_USERNAME:$NAME_TOKEN" "https://api.name.com/v4/domains/$DOMAIN"
```

Esperar `serverName`, `username`, `expireDate`. Si `Permission Denied`, el username puede ser el handle (no el email) — probar variantes.

### Paso 3 — Crear DNS records

```bash
# A record para apex (root)
curl -s -u "$NAME_USERNAME:$NAME_TOKEN" \
  -X POST "https://api.name.com/v4/domains/$DOMAIN/records" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","host":"","answer":"76.76.21.21","ttl":300}'

# CNAME para www
curl -s -u "$NAME_USERNAME:$NAME_TOKEN" \
  -X POST "https://api.name.com/v4/domains/$DOMAIN/records" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","host":"www","answer":"cname.vercel-dns.com.","ttl":300}'
```

`76.76.21.21` es la IP estática anycast de Vercel para apex domains.
`cname.vercel-dns.com` es el CNAME para subdomains.
TTL 300 (5 min) acelera propagación inicial.

### Paso 4 — Registrar dominio en el proyecto Vercel

```bash
# Apex
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$PROJECT_ID/domains?teamId=$VERCEL_TEAM_ID" \
  -d '{"name":"'"$DOMAIN"'"}'

# www (redirect 308 al apex)
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v10/projects/$PROJECT_ID/domains?teamId=$VERCEL_TEAM_ID" \
  -d '{"name":"www.'"$DOMAIN"'","redirect":"'"$DOMAIN"'","redirectStatusCode":308}'
```

Esperar `verified: true` en la respuesta. Si llegue como `false`, hacer polling al `/config` endpoint hasta que la verificación complete.

### Paso 5 — Update env var

```bash
ENV_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
  | jq -r '.envs[] | select(.key=="NEXT_PUBLIC_SITE_URL") | .id')

curl -s -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID?teamId=$VERCEL_TEAM_ID" \
  -d '{"value":"https://'"$DOMAIN"'","target":["production","preview"]}'
```

### Paso 6 — Trigger redeploy

```bash
LATEST_SHA=$(git rev-parse main)
curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.vercel.com/v13/deployments?teamId=$VERCEL_TEAM_ID&forceNew=1" \
  -d "{
    \"name\": \"$PROJECT_NAME\",
    \"project\": \"$PROJECT_ID\",
    \"target\": \"production\",
    \"gitSource\": {
      \"type\": \"github\",
      \"ref\": \"main\",
      \"sha\": \"$LATEST_SHA\",
      \"repoId\": $REPO_ID
    }
  }"
```

Polling de `/v13/deployments/{id}` hasta `readyState: READY`.

### Paso 7 — Verificar rutas

```bash
for route in / /hub /projects /forge /vault /vision /hunter /scout /modules /activity /settings /favicon.svg /manifest.webmanifest; do
  CODE=$(curl -o /dev/null -s -w "%{http_code}" -L --max-time 10 "https://$DOMAIN$route")
  printf "  %-30s %s\n" "$route" "$CODE"
done
```

Esperar 200 para todas. Si quedan en 403 con `x-deny-reason: resolve_no_records`, es propagación de edge — esperar 5–15 minutos.

### Paso 8 — Cleanup

```bash
rm -f /tmp/.env-deploys
```

Token nunca queda en repo, en logs persistentes, ni en commit messages.

---

## Caveats observados

1. **Username candidate testing.** Name.com puede aceptar email completo, handle o ambos según cómo se registró la cuenta. Si la primera variante falla con `Permission Denied`, probar con `{handle}` o `{email}` antes de pedirle al operador.
2. **DNS propagation lag.** Aunque Name.com responda inmediato, Google y Cloudflare DoH tardan 1–5 minutos en propagar. Vercel edge tarda 5–15 minutos en cachear el certificado SSL para el nuevo dominio.
3. **Status 3 (NXDOMAIN) intermitente.** Durante propagación, distintos servers DNS de Google pueden devolver respuestas distintas (algunos shard tienen el record, otros no aún). Esto es normal.
4. **`resolve_no_records` 403 de Vercel.** Lo emite el edge cuando no tiene el mapeo del SNI host al proyecto. Se resuelve solo conforme propaga.
5. **Domain locked.** Por defecto Name.com bloquea transferencias del dominio. Esto es deseado y NO impide la modificación de DNS records.
6. **autoRenew.** Verificar que esté en `true` por API o dashboard. Si está en `false`, el dominio expira sin aviso.

---

## Cuando Forge AI lo ejecute (M5+)

Este runbook se traduce a un adapter `lib/forge/adapters/name-com.ts`:

```ts
type NameComAdapter = {
  connectDomain(input: {
    domain: string;
    nameUsername: string;
    nameToken: string; // from Vault
    vercelProjectId: string;
    vercelToken: string; // from Vault
  }): Promise<{ verified: boolean; sslReady: boolean; canonicalUrl: string }>;
};
```

Forge AI emite eventos (`step:dns-record-created`, `step:vercel-domain-registered`, etc.) que se renderean en `/forge` como timeline live. Costo: ~$0.0005 por ejecución (puro plumbing API; cero tokens de modelo de razonamiento).

---

## Referencias

- Name.com API docs: https://www.name.com/api-docs
- Vercel domains API: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
- Vercel A/CNAME setup: https://vercel.com/docs/projects/domains/working-with-domains#dns-records

# Dossier Experto: Automatización en GitHub (junio 2026)

Fuentes principales: docs.github.com (REST, GraphQL, Apps, Actions, Webhooks, Security), github.blog/changelog.

---

## 1. Mapa completo de capacidades

### 1.1 REST API (api.github.com)
- Cobertura total: repos, issues, PRs, contents, git data (blobs/trees/refs — permite commits sin clonar), checks, deployments, environments, secrets, branch protection/rulesets, orgs, teams, Copilot, Dependabot, code scanning, secret scanning.
- Versionada con header `X-GitHub-Api-Version: 2022-11-28`. SDK oficial: Octokit (JS/Go/.NET/Ruby), o CLI `gh api`.
- Endpoints clave para fábricas: `POST /repos/{owner}/{repo}/generate` (crear desde template), `PUT /repos/.../contents/{path}` (commit de archivo único), Git Data API para commits multi-archivo atómicos (crear blob → tree → commit → actualizar ref).

### 1.2 GraphQL API (api.github.com/graphql)
- Una sola petición para datos anidados (repo + PRs + reviews + checks). Mutations para casi todo, incluidas `createCommitOnBranch` (commit firmado/verificado automáticamente por GitHub — ideal para bots, sale con badge "Verified") y Projects v2 (solo existe en GraphQL).
- Rate limit propio: 5.000 puntos/hora (cada query cuesta según complejidad).

### 1.3 GitHub Apps vs PATs fine-grained
| | GitHub App | PAT fine-grained | PAT clásico |
|---|---|---|---|
| Identidad | propia (bot), no consume asiento | ligada a un usuario | usuario |
| Permisos | granulares por instalación | granulares por repo | scopes amplios |
| Tokens | instalación, expiran en 1 h (JWT firmado con private key → `POST /app/installations/{id}/access_tokens`) | expiración configurable | sin expirar (peligro) |
| Rate limit | 5.000/h base, escala con repos/usuarios hasta 12.500/h; 15.000/h en Enterprise Cloud | 5.000/h | 5.000/h |
| Webhooks | integrados en la app | no | no |
- Regla: **toda automatización de producción/multi-tenant = GitHub App**. PAT fine-grained solo para scripts personales. El token de instalación se puede restringir aún más por repo al pedirlo (`repositories: [...]`).

### 1.4 GitHub Actions (avanzado)
- Triggers: push, pull_request, `workflow_dispatch` (manual + inputs, invocable por API), `repository_dispatch` (evento custom vía API — clave para orquestación externa), `workflow_call` (workflows reutilizables), schedule (cron, mín. 5 min, puede saltarse bajo carga), `workflow_run`.
- Reusable workflows + composite actions: centraliza CI en un repo `.github` de la org y todos los repos cliente lo llaman (1 línea).
- Matrix builds, concurrency groups (cancela runs duplicados), `permissions:` por job sobre el `GITHUB_TOKEN`, OIDC para credenciales sin secretos hacia Vercel/AWS/GCP.
- Self-hosted runners, larger runners, runner groups. Required workflows vía rulesets de org.
- `GITHUB_TOKEN` de Actions no dispara otros workflows (anti-recursión); para encadenar usa una App o PAT.

### 1.5 Webhooks
- Por repo, por org, o por GitHub App (recomendado: un solo endpoint para toda la org). ~70 eventos: push, pull_request, check_run, deployment_status, repository (creación), installation, workflow_run, etc.
- Firma HMAC-SHA256 en `X-Hub-Signature-256` — verificar SIEMPRE. Timeout de entrega: 10 s (responde 202 y procesa async). Redeliveries vía API/UI. Payload máx. 25 MB.

### 1.6 Template repositories
- Repo marcado `is_template: true` → `POST /repos/{owner}/{repo}/generate` crea copia limpia (historial nuevo, 1 commit inicial), con `include_all_branches` opcional. No copia: secrets, webhooks, branch protection, environments, colaboradores — hay que aplicarlos por API después (script de "post-provisioning").

### 1.7 Codespaces
- Dev environments en la nube definidos por `devcontainer.json`. API para crear/parar/listar codespaces, prebuilds para arranque rápido, secrets propios. Útil para entornos de cliente desechables.

### 1.8 Branch protection y Rulesets
- Clásico: `PUT /repos/.../branches/main/protection` (required reviews, status checks, linear history, restricción de push, enforce_admins).
- **Rulesets** (moderno, preferido): por repo u org, aplican a patrones de ramas/tags, modo "evaluate" para probar, bypass list (aquí metes a tu GitHub App para que los agentes puedan mergear), push rules (bloquear archivos/extensiones), required workflows. API: `POST /repos/.../rulesets`.

### 1.9 Environments y Secrets
- Environments por repo (production/preview) con: required reviewers (aprobación manual de deploy), wait timer, restricción de ramas, secrets y variables propios.
- Secrets en 3 niveles: org (compartibles a repos seleccionados — ideal para fábrica), repo, environment. Cifrado libsodium sealed box: para escribir por API obtienes la public key del repo y cifras antes de `PUT`.
- Variables (no sensibles) tienen API paralela.

### 1.10 Dependabot
- Version updates (`dependabot.yml`), security updates (PRs automáticos ante CVE), alerts API. Auto-merge combinable con `dependabot/fetch-metadata` action + `gh pr merge --auto`. Tiene secrets propios (los de Actions no le aplican).

### 1.11 Code scanning / seguridad
- CodeQL (default setup activable por API: `PATCH /repos/.../code-scanning/default-setup`), secret scanning + push protection (gratis en repos públicos; GitHub Advanced Security/Code Security para privados, ahora vendible por separado: GHAS Code Security y Secret Protection), SARIF upload para herramientas externas, security advisories API.

### 1.12 GitHub Models y Copilot APIs
- **GitHub Models**: catálogo de LLMs (GPT, Llama, Phi, DeepSeek, etc.) con inferencia vía `https://models.github.ai/inference` autenticado con PAT/`GITHUB_TOKEN` — permite pasos de IA dentro de Actions sin keys externas. Rate limits por tier bajos (prototipado).
- **Copilot**: API de gestión de asientos/uso por org; **Copilot coding agent** — asignas un issue a Copilot y abre un PR autónomo (asignable por API/GraphQL); Copilot code review en PRs; extensiones Copilot vía GitHub Apps. MCP server oficial de GitHub para agentes externos.

### 1.13 Otros
- GitHub CLI (`gh`) scriptable; octokit/webhooks y Probot para apps Node; GitHub Enterprise audit log API y streaming; repository_dispatch + claim de deploy keys por repo; deploy keys (SSH por repo, read-only o RW); CODEOWNERS para reviews obligatorias por ruta; merge queue para trunk concurrido.

---

## 2. Diez recomendaciones para VForge

1. **Una GitHub App "VForge Provisioner"** instalada en la org, con permisos: `contents:write`, `administration:write`, `pull_requests:write`, `checks:read`, `secrets:write`, `environments:write`. Genera tokens de instalación de 1 h scoped al repo del cliente que toque. Nunca PATs en producción: la App no caduca por rotación humana, no depende de una cuenta personal y sus acciones salen como `vforge[bot]`.
2. **Repo template `vforge-template`** con devcontainer, workflows reusables (que llamen a `org/.github/.github/workflows/ci.yml@main`), `vercel.json`, CODEOWNERS y dependabot.yml. Provisioning = `POST /repos/vforge/vforge-template/generate` + script post-creación (protección, environments, secrets, topics `cliente:{slug}`).
3. **Protege `main` con un ruleset de org** (no por repo): patrón `main` en todos los repos `cliente-*`: PR obligatoria, 0–1 review según tier, status checks requeridos (build + lint), bloqueo de force-push y delete. Añade la App de los agentes a la bypass list solo si el flujo lo exige; mejor que los agentes pasen por PR.
4. **Agentes IA commitean vía GraphQL `createCommitOnBranch`**: commits verificados (badge Verified) firmados por GitHub, sin clonar, atómicos multi-archivo, y atribuidos al bot. Flujo: rama `agent/{tarea}` → commit → PR → checks → auto-merge (`gh pr merge --auto --squash`).
5. **Deploy a Vercel por Git integration** (Vercel app conectada a la org, auto-assign de proyecto al crear repo vía Vercel API `POST /v10/projects` con `gitRepository`), no por CLI en Actions. Si necesitas Actions→Vercel, usa OIDC de Vercel en lugar de `VERCEL_TOKEN` estático.
6. **Webhook único a nivel de App** hacia tu backend VForge: eventos `repository`, `push`, `workflow_run`, `pull_request`, `deployment_status`. Verifica HMAC, responde <10 s, encola (QStash/cola propia). Esto es tu bus de eventos de la fábrica.
7. **Secrets de org compartidos** (claves comunes: Sentry, Resend, etc.) con visibilidad "selected repositories" y añade cada repo nuevo al crearlo; secrets específicos del cliente a nivel de environment `production` con required reviewer humano para deploys sensibles.
8. **Auditoría**: org audit log (API `GET /orgs/{org}/audit-log` requiere Enterprise; sin Enterprise, registra tú mismo cada acción del provisioner en tu DB con request-id, además los commits del bot ya son trazables). Activa secret scanning push protection y CodeQL default setup en cada repo al crearlo.
9. **Orquestación con `repository_dispatch`/`workflow_dispatch`**: tu backend dispara workflows con payload (p.ej. `{"event_type":"redeploy","client_payload":{...}}`) en lugar de que cada repo tenga cron propio. Centraliza lógica en workflows reusables versionados por tag (`@v2`), no `@main`.
10. **Higiene multi-tenant**: naming `cliente-{slug}`, topics y custom properties de org para metadata consultable por API; repos privados; deploy keys solo lectura si un sistema externo necesita clonar; Dependabot grouped updates + auto-merge para parches; archiva (no borres) repos de clientes dados de baja.

---

## 3. Trampas y rate limits

### Rate limits (verificados en docs oficiales)
- REST autenticado: **5.000 req/h** por usuario/PAT. GitHub App: 5.000/h base, **escala +50/h por repo y por usuario sobre 20, tope 12.500/h**; **15.000/h** si la instalación está en org Enterprise Cloud. GraphQL: 5.000 puntos/h (separado). Sin auth: 60/h.
- **Secundarios** (aplican siempre): máx **100 requests concurrentes** (REST+GraphQL compartido), ~900 puntos/min REST, no ráfagas de mutaciones (crear repos/comments en loop sin pausa = 403 `secondary rate limit`). Respeta `Retry-After` y `x-ratelimit-reset`; serializa los POST/PUT con ~1 s entre mutaciones.
- Endpoint de búsqueda: 30 req/min. `GET /rate_limit` no cuenta contra el límite.
- Actions: 256 jobs matrix, 1.000 llamadas API/h por repo desde workflows en algunos endpoints, workflows agendados se desactivan tras 60 días sin actividad en el repo.

### Trampas conocidas
1. **Token de instalación expira en 1 h** — cachéalo y renueva proactivamente; el JWT de App dura máx. 10 min y su `iat` debe ir 60 s en el pasado (clock drift).
2. **`GITHUB_TOKEN` no encadena workflows**: un push hecho con él no dispara `on: push`. Usa token de tu App si necesitas la cascada (y cuidado con loops infinitos: agente commitea → workflow → agente…). Pon guards (`if: github.actor != 'vforge[bot]'`).
3. **Crear repo desde template NO copia** secrets, protección, webhooks ni environments: sin script post-provisioning tendrás `main` desprotegido. Además `generate` es eventual-consistent: espera/poll antes de configurar (404s los primeros segundos).
4. **Secrets por API requieren cifrado libsodium** con la public key del repo — un PUT con texto plano falla o corrompe.
5. Branch protection clásica vs rulesets pueden coexistir y **se acumulan** (gana lo más restrictivo) — confusión típica; migra a rulesets y borra la clásica.
6. **Webhooks**: timeout 10 s y sin reintento automático garantizado de tu lado — encola; entregas pueden llegar fuera de orden y duplicadas (idempotencia por `X-GitHub-Delivery`).
7. **Dependabot no ve los secrets de Actions** (tiene su propio almacén) y sus PRs corren con `GITHUB_TOKEN` read-only por defecto.
8. PAT fine-grained: no soporta todos los endpoints aún (algunos legacy solo con PAT clásico), y los de org pueden requerir aprobación del admin.
9. `schedule` cron en Actions se retrasa o se salta en horas pico — no lo uses para nada crítico en tiempo; dispara desde tu backend.
10. Renombrar/transferir repos rompe integraciones que guardan `owner/name` — guarda y consulta por `repository_id` (numérico/node_id), que es estable.
11. GitHub Models tiene límites de inferencia bajos (prototipo, no producción) — para agentes en producción usa tu propia key de Anthropic/OpenAI.
12. Contents API limita archivos a ~1 MB (lectura JSON) / 100 MB vía media type raw; para repos grandes usa Git Data API o clone.

### Referencias
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/rate-limits-for-github-apps
- https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template
- https://docs.github.com/en/graphql/reference/mutations#createcommitonbranch
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets

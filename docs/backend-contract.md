# Backend Contract — vForge

> Audit + reference for any new frontend that connects to the vForge backend.
> All endpoints below are stable. **V (her brain, tools, skills, memory) is
> sacred and unchanged.** Frontend can be replaced without ever touching her.

**Last audited:** `main` HEAD · 2026-05-17
**TSC check:** `npx tsc --noEmit` → 0 errors
**Runtime target:** Next.js 16 App Router · Node.js runtime · Vercel deploy

---

## 0. V is intact — verification checklist

| What | Where | Status |
|---|---|---|
| System prompt v2 | `lib/forge/system-prompt.ts` · `SENIOR_ENGINEER_DOCTRINE` | ✅ present |
| System prompt v2 (full) | `V_SYSTEM_PROMPT_v2_COMPLETO.md` (35KB) | ✅ present |
| Memory vault | `V_MEMORY_VAULT.md` | ✅ present |
| Full power manifest | `V_FULL_POWER_MANIFEST.md` | ✅ present |
| Self-repair protocol | `V_SELF_REPAIR_PROTOCOL.md` | ✅ present |
| Tools array | `lib/forge/tools.ts` · `TOOLS` (22+ tools cabled) | ✅ present |
| Model routing | `lib/forge/routing.ts` · `routeFor()` | ✅ present |
| Hetzner body | `lib/forge/v-server.ts` · `callVServer()` | ✅ present |
| Personality (DB) | `system_config.ai_personality` (Neon) | runtime-managed |
| Skills (DB) | `skills` table (Neon) | runtime-managed |
| Memory (DB) | `conversations`, `knowledge_base`, `audit_events` | runtime-managed |
| Directives (DB) | `agent_directives` | runtime-managed |
| Agent config (DB) | `agent_config` | runtime-managed |

Anything tagged "runtime-managed" lives in Neon Postgres and is read by
the brain at request time. Frontend never touches these — V owns them.

---

## 1. Auth model (current state)

- **Operator (Luis)**: hardcoded `user_id = "operator_luis"` everywhere
  until M11 (Clerk). Endpoints that mutate vault require a separate
  bearer token (`Authorization: Bearer <operator_token>`) checked
  against `OPERATOR_AUTH_TOKEN` env. The frontend stores this token in
  `localStorage.vforge_operator_token` after the user enters it.
- **Public read** endpoints (e.g. `/api/projects`) are open within the
  app — middleware-protected by domain.
- **`x-internal-auth`** header is reserved for cross-service calls
  (Hetzner v-server, scheduled jobs).

For the new frontend's MVP, treat `operator_token` as the single
sensitive secret. Everything else is open per-route.

---

## 2. The brain — `/api/forge/run` (SSE streaming)

**This is the most important endpoint. It IS V.**

### Request

```http
POST /api/forge/run
Content-Type: application/json

{
  "messages": [
    { "role": "user" | "assistant", "content": "<string | content blocks>" }
  ],
  "sessionId": "<string>",            // required
  "userId": "operator_luis",           // optional, defaults to operator
  "projectId": null | "<projectId>"   // optional scope
}
```

`content` can also be Anthropic-style blocks for vision:

```json
[
  { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." } },
  { "type": "text", "text": "what is this?" }
]
```

### Response (SSE stream)

`Content-Type: text/event-stream`. Each event is `data: <json>\n\n`.
Event types the frontend must handle (and ignore unknown ones):

| Event | Payload | Meaning |
|---|---|---|
| `text` | `{ type: "text", value: string }` | Append to current assistant message |
| `tool_use_start` | `{ type: "tool_use_start", id, name }` | V invoked tool `name` |
| `tool_use_result` | `{ type: "tool_use_result", id, ok: boolean, summary }` | Tool finished |
| `model_fallback` | `{ type, from, to, status, reason }` | Cascade fell over to next model |
| `done` | `{ type: "done", tokensIn, tokensOut, model }` | Turn ended cleanly |
| `error` | `{ type: "error", message }` | Recoverable error mid-stream |

The endpoint:
- Resolves the model cascade (`agent_config.chat-main` → `system_config.default_model` → registry default)
- Persists the user turn to `conversations` immediately
- Runs the tool loop up to `MAX_TOOL_ROUNDS = 5`
- Calls OpenRouter via OpenAI SDK with `stream: true`
- Tools execute server-side via `dispatch()` in `lib/forge/tools.ts`
- Persists assistant turn(s) + audit events at the end

### Minimum frontend integration

```ts
const res = await fetch("/api/forge/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, sessionId }),
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const evt = JSON.parse(line.slice(6));
    if (evt.type === "text") /* append */;
    if (evt.type === "tool_use_start") /* show "V is doing X" */;
    if (evt.type === "error") /* surface */;
  }
}
```

---

## 3. Memory & sessions

### `/api/forge/active-session`

**GET** `?scope=general|<projectId>` — returns or creates the canonical
session id for the operator in that scope. **Use this in the frontend
on chat mount**, so phone + desktop + any other UI share the same
conversation.

```json
{ "sessionId": "s_general_xxxxxx" }
```

**POST** `{ scope }` — same behavior, mutation-explicit.

### `/api/forge/conversations`

**GET** `?sessionId=<id>&userId=<id>&limit=100` — returns up to 100
most-recent turns (then re-sorts ASC for replay).

```json
{
  "turns": [
    {
      "id": "uuid",
      "role": "user" | "assistant" | "system" | "tool",
      "content": "...",
      "created_at": "2026-05-17T05:00:00Z",
      "tokens_in": null,
      "tokens_out": 142
    }
  ]
}
```

**Frontend must rehydrate on chat mount.** Skipping this is what made V look
like she "started from zero" — her memory was always there server-side.

### `/api/forge/recap`

**POST** `{ sessionId }` — V summarizes the session and stores it in
`knowledge_base`. Useful before closing a long session.

### `/api/forge/cost`

**GET** `?since=2026-05-01` — returns spend summary by model from
`audit_events`. Useful for `/activity` page.

### `/api/forge/transcribe`

**POST** with multipart audio. Returns `{ text: string }`. Backed by
OpenAI Whisper. Use for voice-to-text composer button.

### `/api/forge/extract-secret`

**POST** `{ imageBase64, hint }` — uses GPT-4o vision to extract a key
from a screenshot. Returns `{ name, value }` or `{ error }`. Used by
the Vault "paste screenshot" flow.

---

## 4. Projects

### `/api/projects`

**GET** → `{ projects: Project[] }` ordered by category priority.

```ts
interface Project {
  id: string;            // slug, [a-z0-9_-]+
  name: string;
  category: "produccion" | "activo" | "en_revision" | "en_pausa" | "archivo" | "pendiente_borrado";
  status: string;
  github_repo: string | null;       // e.g. "turbillon50/rideme"
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  domain?: string | null;
}
```

**POST** body:

```json
{
  "id": "rideme",
  "name": "RideMe",
  "description": "Plataforma de transporte",
  "github_repo": "turbillon50/rideme",
  "vercel_url": "https://rideme-v1.vercel.app",
  "domain": "rideme.allglobal.ec",
  "category": "activo"
}
```

Returns `201 { id, name }` or `409` if id exists, `400` validation.

### `/api/projects/[id]`

**GET** → full project detail · **PATCH** → partial update · **DELETE** → soft delete (sets category=pendiente_borrado).

### `/api/projects/sync`

**POST** `Authorization: Bearer <operator_token>` — cross-references
Vercel + GitHub APIs and upserts the projects table.

```json
{ "inserted": 3, "updated": 7, "total": 34 }
```

---

## 5. Vault (operator + project secrets)

### Operator secrets

| Route | Method | Purpose |
|---|---|---|
| `/api/vault/operator-secrets` | `GET` | List secrets (no values) |
| `/api/vault/operator-secrets` | `POST` | Create secret `{ key, value, source, scope }` |
| `/api/vault/operator-secrets/[id]` | `DELETE` | Remove |
| `/api/vault/operator-secrets/[id]/value` | `GET` | Reveal value (requires Bearer) |

All write endpoints require `Authorization: Bearer <operator_token>`.

### Project secrets

Same shape under `/api/vault/project-secrets`, scoped to a project. V
uses these via the `project_secret_*` tools.

---

## 6. GitHub helpers

| Route | Method | Purpose |
|---|---|---|
| `/api/github/repos` | `GET` | List repos for `turbillon50` |
| `/api/github/repos/[owner]/[repo]` | `GET` | Repo detail + last commit |

V herself has 14+ GitHub tools (`github_list_repos`, `github_read_file`,
`github_create_file`, `github_create_pull_request`, …) wired in
`tools.ts`. Frontend can use these via natural chat or call the
helper routes directly for simple reads.

---

## 7. V infrastructure endpoints (rarely consumed by UI)

| Route | Purpose |
|---|---|
| `/api/v-health` | Liveness check + DB connectivity |
| `/api/v-bootstrap` | Idempotent: ensures system_config, skills, directives seeded |
| `/api/v-self-heal` | Repairs broken `skills` table schema |
| `/api/v-full-repair` | Drops + reinjects all skills (90+) |
| `/api/v-complete-injection` | One-shot injection of canonical skills set |
| `/api/v-full-power` | Wires up env vars + tokens (diagnostic only) |
| `/api/v-skills-nuclear` | Last-resort: rebuild skills table from scratch |
| `/api/v-dns-sync` | Push DNS records for vforge.site |
| `/api/admin/migrate` | Apply pending migrations (run once on deploy) |
| `/api/admin/health` | Admin-level health snapshot |
| `/api/stats` | Public stats summary (counts) |
| `/api/fix-skills-table` | Legacy fix endpoint |

Most of these exist as escape hatches for V to self-repair via her
`http_request` tool. The new frontend doesn't need to call them
unless adding an admin panel.

---

## 8. Database (Neon Postgres)

| Table | What lives there |
|---|---|
| `system_config` | Singleton: `ai_name`, `ai_personality`, `default_model`, `default_tone`, `default_language` |
| `operator_secrets` | AES-256-GCM-encrypted operator API keys |
| `user_secrets` | Zero-knowledge user secrets (client-encrypted) |
| `project_secrets` | Per-project encrypted secrets |
| `projects` | Project catalog (id, github_repo, vercel_url, category, etc.) |
| `conversations` | Every turn (user/assistant/tool) for replay + V's memory |
| `knowledge_base` | Recaps, explicit memories saved via `memory_save` tool |
| `audit_events` | Every Ring 1+ action V (or operator) takes |
| `skills` | V's 90+ installable skills with system_prompt + required_tools |
| `agent_directives` | Locked behaviors (e.g. core file protection) |
| `agent_config` | Per-task model selection (chat-main, code, fast, classify, …) |

Migration files: `migrations/001_initial.sql` → `010_fix_locked_directive_trigger.sql`.

---

## 9. Environment variables required

Configured in Vercel project settings. The frontend doesn't need to
know any of these — they're consumed server-side by `lib/`.

| Var | Used by |
|---|---|
| `DATABASE_URL` | Neon Postgres |
| `VFORGE_MASTER_PEPPER` | `lib/vault/operator-crypto.ts` (AES-256-GCM derivation) |
| `OPENROUTER_API_KEY` | `/api/forge/run` (LLM gateway) |
| `OPENAI_API_KEY` | Transcribe + extract-secret (vision) |
| `GITHUB_TOKEN` | `lib/github/client.ts` |
| `VERCEL_TOKEN` | `lib/vercel/client.ts` |
| `NAMECOM_TOKEN` + `NAMECOM_USERNAME` | `lib/namecom/client.ts` |
| `OPERATOR_AUTH_TOKEN` | Bearer for vault write endpoints |
| `V_SERVER_URL` | Hetzner Flask (default `http://178.105.135.26:5000`) |
| `V_SERVER_TOKEN` | Header `X-V-Token` for Hetzner (optional) |

---

## 10. What V can do (tool inventory at a glance)

22+ tools categorized by Ring (privilege):

**Ring 0 — read only**
GitHub: `github_list_repos`, `github_get_repo`, `github_read_file`, `github_list_commits`, `github_list_directory`, `github_search_code`, `github_list_pull_requests`
Vercel: `vercel_list_projects`, `vercel_get_project`, `vercel_list_deployments`, `vercel_get_deployment`, `vercel_get_domain_config`
Name.com: `namecom_list_domains`, `namecom_get_domain`, `namecom_list_records`
Vault: `vault_list_secrets`, `project_secret_list`
Memory: `memory_save`, `memory_search`
Routing: `model_recommend`, `forge_cost_report`, `openrouter_query`
Skills: `skill_search`, `skill_install`, `skill_uninstall`
Subagents: `spawn_subagent`, `list_subagent_roles`
HTTP: `http_request`

**Ring 1 — repo / infra writes (auto on feature branches)**
GitHub: `github_create_file`, `github_update_file`, `github_delete_file`, `github_create_branch`, `github_create_pull_request`, `github_create_repo`
Vercel: `vercel_create_project`, `vercel_set_env_var`, `vercel_add_domain`, `vercel_trigger_deployment`
Name.com: `namecom_upsert_record`, `namecom_delete_record`
Projects: `projects_sync`, `project_secret_save`, `project_secret_delete`
Hetzner: `remote_execution` (Python/Node sandbox)
V self-management: `agent_config_set`, `directive_create`, `directive_update`, `directive_delete`

**Ring 2 — requires confirmed=true gate**
- `github_create_file` / `github_update_file` on `turbillon50/vforge` `main`
- `ssh_command_executor` (Hetzner SSH access to remote servers)
- `browser_control` (Playwright on Hetzner — screenshots, navigation, scripting)
- `image_generation` (OpenRouter Gemini image gen on Hetzner)

**Ring 3 — vault + financial**
Currently not wired as tools; reserved for explicit operator-approved flows.

**Protected core files** (V can never modify, hard-blocked in `tools.ts`):
- `lib/forge/tools.ts`
- `lib/forge/system-prompt.ts`
- `lib/forge/gemini-adapter.ts`
- `lib/forge/v-server.ts`
- `lib/forge/routing.ts`
- `lib/forge/model-config.ts`
- `lib/forge/agent-config.ts`
- `lib/forge/openrouter-catalog.ts`
- `lib/forge/models.ts`

---

## 11. Minimum frontend checklist

For any new frontend to be "wired to V" properly, it needs:

- [ ] Call `GET /api/forge/active-session?scope=general` on chat mount → get `sessionId`
- [ ] Call `GET /api/forge/conversations?sessionId=...&limit=100` → rehydrate UI with `turns`
- [ ] Composer submits to `POST /api/forge/run` with `{ messages, sessionId }`
- [ ] Stream SSE events: `text` append · `tool_use_start` show "V doing X" · `error` surface · `done` finalize
- [ ] AbortController on unmount + stop button
- [ ] localStorage `vforge_operator_token` for vault-write flows
- [ ] **Never** generate its own session id without consulting `/active-session` first (or sessions diverge across devices)
- [ ] **Never** call any `lib/forge/*` directly — those are server-only
- [ ] **Never** modify V's tables in DB through the UI — V owns them

---

## 12. Status of repo (audit snapshot)

| Item | Status |
|---|---|
| `npx tsc --noEmit` on `main` | ✅ 0 errors |
| Total API endpoints | 30 |
| Migrations applied (file count) | 8 (001, 002, 003, 004, 007, 008, 009, 010) |
| V identity files preserved | ✅ all 5 (`V_*.md`) |
| Tools wired | 22+ in `TOOLS` array |
| Protected core files locked | ✅ 9 paths in `PROTECTED_CORE_PATHS` |
| Hetzner v-server reachable | requires `V_SERVER_URL` env (default IP works) |
| OpenRouter cascade configured | ✅ via `lib/forge/routing.ts` |

**Conclusion:** backend is operational, V is intact, contracts above are
stable. Any new frontend that follows §11 will work the day it ships.

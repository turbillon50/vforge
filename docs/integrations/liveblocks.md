# Integración: Liveblocks (presencia + colab tiempo real)

> *Entra en M13 (Fase 2). Cursors compartidos y presencia en `/forge` y `/projects/[id]` cuando Luis y un colaborador estén viendo el mismo proyecto. ADR-009 lo eligió sobre Yjs casero porque el upside (mantenimiento perpetuo de WebSocket sync) no se justifica para Fase 2.*

---

## Resumen

- **Provider:** [Liveblocks](https://liveblocks.io) — presencia, cursors, comments, CRDTs gestionados
- **Rol en vForge:** presencia y colab tiempo real en `/forge` (Luis + colaborador en el mismo chat), en `/projects/[id]` (cursors compartidos sobre el detalle del proyecto), y eventualmente en el editor de prompts.
- **Milestone:** M13 — Fase 2
- **Anillo:** 0-1 (presencia es read-only; comments y collab edits son write con scope a la room)
- **Adapter file (futuro):** `lib/forge/adapters/liveblocks-rooms.ts`
- **Estado actual:** Pendiente (cuenta no creada) — actualizar cuando el operador la cree

---

## Inputs requeridos del operador

```
LIVEBLOCKS_SECRET_KEY                 sk_prod_...   server-side, encrypted, NUNCA al cliente
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY     pk_prod_...   frontend-safe, exposed al browser
```

Dos variables. La secret va encrypted; la public va plain y se expone vía `NEXT_PUBLIC_` para que el SDK del cliente la lea.

---

## Cuenta y onboarding

1. Ir a https://liveblocks.io/sign-up — registrarse con GitHub OAuth.
2. Crear proyecto desde el dashboard → "Create Project" → nombrar `vforge` → seleccionar production environment.
3. En https://liveblocks.io/dashboard/projects/{id}/apikeys copiar las dos keys: `pk_prod_...` (public) y `sk_prod_...` (secret).
4. (Opcional) configurar webhooks en `/webhooks` para events `roomCreated`, `userEntered`, `userLeft` — útil para auditar quién entró a qué room. No requerido en M13.
5. Agregar `LIVEBLOCKS_SECRET_KEY` (encrypted) y `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` (plain) a Vercel env vars en production + preview + development.

---

## Endpoints / SDK usados

Liveblocks tiene dos lados: **backend** (`@liveblocks/node`) para autorizar sesiones e issue tokens; **frontend** (`@liveblocks/react`) para hooks de presencia/storage.

```ts
// app/api/liveblocks-auth/route.ts — backend authorization
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

export async function POST(req: Request) {
  const { user } = await getCurrentUser(req); // Clerk
  const { room } = await req.json();

  const session = liveblocks.prepareSession(user.id, {
    userInfo: { name: user.name, avatar: user.imageUrl },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}

// app/forge/layout.tsx — frontend
"use client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

<LiveblocksProvider authEndpoint="/api/liveblocks-auth">
  <RoomProvider id="forge-main">
    {children}
  </RoomProvider>
</LiveblocksProvider>
```

Endpoints relevantes (REST API bajo `https://api.liveblocks.io/v2`):

| Endpoint | Método | Para qué |
|---|---|---|
| `/rooms` | GET/POST | Listar/crear rooms |
| `/rooms/{id}` | GET/POST/DELETE | Inspeccionar/actualizar/borrar room |
| `/rooms/{id}/active_users` | GET | Quién está conectado ahora |
| `/rooms/{id}/storage` | GET | Snapshot del CRDT storage |

---

## Runbook (cuando ejecutemos M13)

1. Verificar `LIVEBLOCKS_SECRET_KEY` y `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` vía `getOperatorSecret` y `process.env` respectivamente. Si falta, abortar M13.
2. Crear `lib/forge/adapters/liveblocks-rooms.ts` implementando el contract. Capacidades: `["presence", "realtime", "comments"]`. Anillo 0-1.
3. Métodos del adapter: `createRoom(projectId)`, `authorizeSession(userId, roomId)`, `deleteRoom(roomId)` (Anillo 2).
4. Crear route `app/api/liveblocks-auth/route.ts` que valide Clerk session y autorice el room scoped a la membresía del usuario en el proyecto.
5. Wrap el layout de `/forge` y `/projects/[id]` con `<LiveblocksProvider>` + `<RoomProvider>`. Room IDs: `forge-{userId}` para chat personal, `project-{projectId}` para vista compartida.
6. Componente `<PresenceCursors>` que use `useOthers()` de `@liveblocks/react` para renderizar avatars + cursors. Tokens de color desde nuestro design system (`var(--green)`, `var(--accent)`).
7. Agregar tool al cerebro: `realtime_room_create(project_id)` (Anillo 1).
8. Test mínimo: dos pestañas del browser entrando al mismo room, verificar que cada una ve al otro user en `useOthers()`.

---

## Caveats / notas operativas

- **Free tier:** 50 MAUs, 20 rooms simultáneas, 100 conexiones. Suficiente para Fase 2 con 5-10 usuarios; renegociar a paid en Fase 3 (ADR-009).
- **Public key seguro de exponer.** Está restringida por dominio en el dashboard → settings; configurar allowlist con `vforge.site` y `*.vercel.app` para previews.
- **Room IDs estables.** No regenerar room ID entre sesiones — los presence states se asocian al room, no al user.
- **Storage CRDT** (futuro M16+) tiene un cap de 1 MB por room en free tier. Para colab en prompt editor, los prompts > 1 MB son improbables; si llega el caso, splittear en sub-rooms.
- **Rotación de keys:** dashboard `/apikeys` → revoke + regenerate. El public key cambia y todos los clientes deben recargar; planear ventana de mantenimiento.
- **Vendor alternatives:** Yjs + Hocuspocus self-hosted, PartyKit, Ably. Migrar implica reescribir el adapter + el provider del frontend; viable pero ~1 sprint.

---

## Estado de env vars en Vercel

```
LIVEBLOCKS_SECRET_KEY              encrypted    PENDIENTE — agregar antes de M13
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY  plain        PENDIENTE — agregar antes de M13
```

---

## Referencias

- Docs: https://liveblocks.io/docs
- SDK Node: https://github.com/liveblocks/liveblocks/tree/main/packages/liveblocks-node
- SDK React: https://github.com/liveblocks/liveblocks/tree/main/packages/liveblocks-react
- Dashboard: https://liveblocks.io/dashboard

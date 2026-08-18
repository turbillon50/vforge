# MetaMCP / Ojo de Vulcano

## Boundary

VForge never connects from the browser to a Docker IP, the Hetzner public IP, or
MetaMCP's internal port. The application uses the HTTPS boundary:

- Ojo API: `https://metamcp.vforge.site/ojo`
- Internal MetaMCP port: operator infrastructure only; never exposed to a client
  namespace.

The browser calls VForge's owner-only routes under `/api/forja/ojo/*`. Those
server routes authenticate the Clerk owner and inject the Ojo credential
server-side.

## Required environment

```dotenv
OJO_BASE=https://metamcp.vforge.site/ojo
OJO_TOKEN=
```

`OJO_TOKEN` is required and has no code fallback. It must remain encrypted in
the runtime secret store. Never prefix it with `NEXT_PUBLIC_`, serialize it to
React props, place it in a query string, or save it in Brain/memory.

All Ojo requests send the credential only through `X-Ojo-Token`.

## Client namespace rule

A client namespace may receive only the scoped web server assigned to that
tenant. It must never receive MetaMCP administration, shell/executor, Neon,
Mesh, Brain administration, or an operator credential.

## Rotation

1. Generate a new random credential in the operator environment.
2. Update Ojo and every trusted VForge runtime.
3. Restart Ojo and create a fresh VForge deployment.
4. Verify an authorized owner request and an unauthorized request.
5. Remove the previous credential.

Do not log either credential during the rotation.

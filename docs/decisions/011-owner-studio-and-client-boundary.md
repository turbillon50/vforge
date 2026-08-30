# ADR-011: Un estudio canónico para el owner y portales aislados para clientes

- **Estado:** Accepted
- **Fecha:** 2026-08-23
- **Decisores:** Luis, Codex
- **Contexto técnico:** VForge owner UI, portal en vivo, OAuth y tela MCP

## Contexto

VForge acumuló dos productos autenticados en paralelo. `/app` contenía parte del
catálogo owner, mientras `/workspace` mezclaba onboarding, conexiones y una
versión anterior del builder. Además, `/app/home` y `/app/chat` conservaban otra
interfaz oscura con rutas cruzadas. Los callbacks OAuth de GitHub, Vercel,
Stripe y MindContext regresaban al owner a `/workspace/conexiones`, por lo que
una sesión correcta terminaba dentro de la experiencia equivocada.

Las capacidades valiosas ya estaban separadas en contratos reales: chat
streaming y tools en `/api/forge/run`, catálogo owner en `/api/projects`,
OAuth, MetaMCP/Ojo server-side y el portal `/app/live/:projectId` con roles,
comentarios, eventos e invitaciones. El problema era la composición del
producto, no la ausencia total de backend.

## Decisión

`/app/chat` es el estudio canónico del owner y la portada posterior al login.
Une conversación, proyecto activo, GitHub, Vercel, estado del mesh/modelos y
las vistas escritorio, móvil y administración en un solo flujo.

- `/app` y `/app/home` redirigen a `/app/chat`.
- Los callbacks OAuth del owner regresan a `/app/integrations`.
- `/workspace` permanece como espacio de clientes; no es una segunda consola
  del owner.
- `/app/live/:projectId` permanece como sala compartible y aplica el alcance
  owner/reviewer/observer desde la API propia.
- Las URLs del visor se obtienen mediante un BFF que llama a la API propia; el
  token interno y los ejecutores nunca llegan al browser.
- Composio es una capa opcional de herramientas por sesiones. No sustituye el
  relay de Hetzner ni bloquea el chat cuando no existe `COMPOSIO_API_KEY`.

## Razón

El centro de VForge es la secuencia conversación → herramientas → cambio →
preview → feedback → deploy. Un menú con varias implementaciones parciales
oculta esa secuencia y hace imposible saber qué versión es canónica. La
separación owner/cliente reduce cruces de permisos y permite evolucionar el
builder sin exponer infraestructura privilegiada a invitados.

## Consecuencias

**Fácil:** una sola ruta owner para construir; OAuth vuelve al lugar correcto;
el modelo, las tools y el visor muestran estado real; los clientes conservan un
portal de alcance limitado.

**Difícil:** las rutas históricas siguen existiendo mientras se migra código
dependiente y deben redirigir o quedar fuera de la navegación owner.

**Deuda asumida:** este corte no incluye Monaco, sandbox de terminal ni
colaboración CRDT. Esas capacidades sólo entrarán cuando exista un contrato de
archivos/ejecución que no dependa de datos simulados.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| Mantener `/app` y `/workspace` como dos productos owner | Repite navegación, estado y permisos; fue la causa directa de la mezcla visible |
| Hacer Composio obligatorio para el chat | El motor híbrido ya opera sin Composio y no existe aún una credencial de plataforma |
| Agregar Monaco en este corte | Un editor sin filesystem/sandbox real sería otra superficie decorativa |
| Sustituir el portal propio por iframes sin BFF | Expondría URLs/roles sin la revalidación de la API propia |

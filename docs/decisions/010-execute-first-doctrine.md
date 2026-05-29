# ADR-010: V ejecuta directo — sin gates de pre-confirmación

- **Estado:** Accepted
- **Fecha:** 2026-05-29
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Modelo de permisos del cerebro Forge / herramientas de V (`lib/forge/tools.ts`, `system-prompt.ts`)
- **Supersede en parte:** [ADR-004](./004-stream-first-ux.md) (la pausa para confirmar Anillo 2/3)

## Contexto

El modelo original (ADR-004, `architecture.md §4`) clasificaba cada acción del cerebro en anillos 0–3 y exigía **confirmación humana explícita** (botón "Procede", o 2FA para Anillo 3) antes de ejecutar Anillo 2/3.

El codex review del 16-may-2026 (commit `5f38f2f`) implementó esa doctrina como gates duros: `github_create_file` / `github_update_file` a `main` y **todo** `ssh_command_executor` devolvían `RING2_NEEDS_CONFIRMATION` y exigían `confirmed=true`. En un producto single-operator donde V fue diseñada para *ejecutar*, esto la dejó incapaz de operar: pedía permiso para un `ls`, esperaba el "sí" de Luis y rellamaba la tool. Se revirtió en `704f69a`.

## Decisión

**V ejecuta directo.** Los anillos siguen existiendo como **clasificación de blast radius** (para saber cuándo *avisar*), no como gate de pre-confirmación.

- **Anillo 0–2** (lectura; repo write incl. `main`; infra write — Vercel, env vars, DNS, dominios, Actions; SSH normal): ejecuta directo.
- **Anillo 3** (irreversible de gran blast radius — drop DB de producción, rotar master key del vault, borrar repo/proyecto, cómputo > $10 USD de un golpe): ejecuta **+ avisa en la misma respuesta**. "Avisar" = *"voy a X porque Y, lo hago"*, **no** *"¿puedo X?"*.

El freno humano vive en el **audit log + revert trivial**, no en pre-confirmaciones. `executeTool()` sigue insertando cada llamada en `audit_events` con redacción automática de password/private_key.

## Razón

1. **Operador único.** Luis ya dio el contexto al pedir la acción; una pre-confirmación por acción es fricción pura.
2. **El gate paralizaba.** La evidencia empírica (revert `704f69a`) mostró que V dejaba de ser ejecutor y volvía a ser "asistente que sugiere".
3. **Trazabilidad sin bloqueo.** El audit log + `git revert` / `vercel rollback` dan el mismo poder de auditoría y deshacer, sin frenar cada paso.

## Consecuencias

**Fácil:** V opera de verdad; un solo turno basta para tareas multi-paso. No hay round-trips de "¿procedo?" → "sí" → rellamar tool.

**Difícil:** un comando equivocado se ejecuta antes de que Luis lo lea — mitigado porque V avisa en la misma respuesta y el audit log permite revert inmediato.

**Deuda asumida:** la única barrera dura que queda en código es `allow_main=true` para `github_delete_file` sobre `main`. Si en el futuro se quiere un freno para una acción concreta, se hace **por-path explícito**, no re-introduciendo un gate genérico `confirmed=true` — eso es justo lo que este ADR revierte. Cualquier review que proponga re-añadir gates de confirmación a Anillo 2 debe leer este ADR primero.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Mantener gates Anillo 2/3 (ADR-004 original)** | Paralizó a V; revert `704f69a` |
| **Gate solo en Anillo 3** | Aun así frena acciones legítimas frecuentes (rotaciones, limpiezas); el aviso-en-mismo-turno + audit log cubre el riesgo |
| **Confirmación por email (Resend, M9.5)** | Útil como *aviso* asíncrono, no como gate bloqueante; se reframea a "aviso de Anillo 3" |

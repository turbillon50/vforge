# ADR-007: Adoptar Next.js 16 + React 19 + Tailwind 4 (en vez de Next 14 + Tailwind 3.4)

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Frontend MVP de vForge, post-handoff de v0.dev

## Contexto

El brief original (`docs/v0-prompt.md` §2) y el playbook (`docs/playbook.md` §3) especificaban:

- Next.js 14 (App Router)
- React 18
- Tailwind CSS 3.4
- npm como package manager

El export de v0.dev (`turbillon50/vforge-v0@6aefff9`) llegó con un stack más reciente:

- Next.js **16.2.4** (con Turbopack como bundler default)
- React **19**
- Tailwind CSS **4.2** (sintaxis nueva: `@import 'tailwindcss'`, `@theme inline`, sin `tailwind.config.ts`)
- pnpm-lock.yaml (no usamos pnpm)

Frente a este drift hay dos caminos: (a) degradar a Next 14 / Tailwind 3.4 para cumplir el brief, o (b) adoptar el stack más reciente y documentarlo como decisión consciente.

## Decisión

**Adoptar el stack que v0 entregó:** Next 16 + React 19 + Tailwind 4. Migrar de pnpm-lock a `package-lock.json` (npm sigue siendo el package manager — solo cambia el lockfile, no el flujo).

## Razón

1. **Costo de degradar > beneficio.** Bajar de Next 16 a Next 14 implicaría desinstalar Turbopack-defaults, refactorizar `@theme inline` a `tailwind.config.ts` (Tailwind 3 → 4 es la migración mayor, no menor), revisar APIs cambiadas en React 18→19. Estimado: 6–10 horas. El beneficio: ninguno funcional, solo cumplir una spec que se escribió antes de saber que v0 entrega versiones más recientes.
2. **Tailwind 4 es estricto superior** para lo que estamos haciendo: `@theme inline` resuelve los tokens CSS variables a utilities Tailwind sin `tailwind.config.ts`, lo cual elimina una capa de duplicación entre tokens y clases. El sistema de tema día/noche que ya tenemos se beneficia directo.
3. **Next 16 + Turbopack** dan builds en ~4 segundos para 13 rutas. En Next 14 con webpack era el doble. Para Forge AI (futuro) que va a iterar y desplegar dinámicamente, esa diferencia compone.
4. **React 19** no introduce breaking changes que nos afecten en MVP (no usamos forwardRef en formas exóticas, no Server Components avanzados aún). El `useTransition` y los `use()` mejorados llegarán cuando construyamos el cerebro Forge — bonus gratis.
5. **Compatibilidad de ecosistema.** Todas las dependencias que ya usamos (framer-motion 12, lucide-react 0.564, next-themes 0.4, shadcn primitives) son compatibles con Next 16 / React 19. Vercel deploy lo soporta nativo.
6. **Lección 9.4 del playbook aplica:** "confiar en los defaults de v0 — no pelear con su scaffold". Si v0 emitió Next 16 + Tailwind 4, es porque ese es su default actual. Forzarlo a algo distinto cuesta horas.

## Consecuencias

**Fácil:**
- Builds rápidos (~4s) con Turbopack.
- Token system Tailwind 4 sin `tailwind.config.ts` (menos archivos, menos duplicación).
- React Compiler (cuando salga estable) será opt-in directo.
- Migraciones futuras a Next 17+ menos costosas.

**Difícil:**
- Ecosistema Tailwind 4 más nuevo: algunos plugins de terceros pueden no haber migrado. No usamos plugins por ahora; si hace falta uno (typography, container-queries), verificar compat en su repo.
- Documentación de Next 16 menos abundante que Next 14 al momento (pero crece rápido).
- Algunos snippets de Stack Overflow para React 18 ya no aplican.

**Deuda técnica asumida:**
- Cualquier copy-paste de código React 18 hay que validar contra React 19.
- Si llega un cliente externo que requiere Next 14 LTS, hay que tener una rama de compatibilidad.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Degradar a Next 14 / Tailwind 3.4** | 6–10h de trabajo sin beneficio funcional |
| **Mantener pnpm de v0** | npm es el default del ecosistema y de los workflows del agente; un solo package manager por proyecto |
| **Adoptar pnpm a nivel organización** | Cambio mayor de tooling para todo el catálogo de proyectos; no se justifica para un MVP |

## Implicaciones para el playbook y `v0-prompt.md`

- Actualizar `docs/playbook.md` §3 (stack obligatorio) en el siguiente commit doc (o aceptar que el ADR es la fuente de verdad y el playbook se beneficia con un nota referencial).
- En proyectos futuros, **escribir el brief con stack mínimo (LTS conocidas)** pero declarar explícitamente que **adoptar el default de v0 es aceptable y preferible** salvo justificación arquitectónica.
- Cualquier proyecto vForge nuevo que arranque hoy nace con Next 16 + Tailwind 4 por default. Si un cliente requiere LTS, abrir un ADR específico del proyecto.

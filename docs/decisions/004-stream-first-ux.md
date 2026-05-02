# ADR-004: Stream-first en el chat de Forge, plan visible en línea

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** UX del chat `/forge` y orquestación de pasos

## Contexto

Cuando Forge ejecuta una tarea multi-paso (ej. "cambia el logo del Castores"), hay dos paradigmas de UX posibles:

1. **Plan-then-execute.** Forge muestra el plan completo en una pantalla, el usuario aprueba, después se ejecuta y se muestra el resultado.
2. **Stream-first.** Forge va planeando y ejecutando en streaming, mostrando cada paso en el chat conforme sucede. El plan es el primer mensaje; los pasos llegan como mensajes posteriores con checkmarks.

## Decisión

**Stream-first.** Forge planea y ejecuta en el mismo stream del chat. El primer mensaje del bot es el plan ("Ok. Plan: 1) ... 2) ... ¿procedo?"). Después de la confirmación humana, los pasos aparecen como mensajes individuales con `<ForgeOrb state="loading">` mientras corren y checkmarks verdes cuando completan.

## Razón

1. **UX más natural.** El usuario ve la mascota viva, en tiempo real. Es "trabajando contigo", no "trabajando offline y avísame".
2. **Menos pantallas.** Ya tenemos `/forge` como interfaz; una pantalla aparte de "plan" rompería el flujo.
3. **Mejor sensación de control.** El usuario puede interrumpir cualquier paso ("para, ese commit no era el correcto") sin esperar a que termine todo.
4. **Refleja el comportamiento real del modelo.** Claude (y otros) ya streamea token-por-token; aprovechémoslo.
5. **Validado en este sesión.** El comportamiento que mockeamos en `/forge` ("Repo clonado ✓ · Logo sustituido ✓ · Building en Vercel...") es exactamente este patrón.

## Consecuencias

**Fácil:**
- UI consistente: el chat es la única superficie. No hay pantallas escondidas.
- Iteración natural: el usuario puede pedir cambios al vuelo.
- Implementación con Server-Sent Events estándar.

**Difícil:**
- Undo es más complicado. Si el paso 3 ya commiteó al repo y el usuario se arrepiente en el paso 4, hay que revertir el commit.
- Las acciones de Anillo 2/3 (deploy, rotación de keys) deben **pausar** el stream y esperar confirmación humana, sin perder el contexto del plan.

**Deuda técnica asumida:**
- Necesitamos un "checkpoint" automático antes de cada acción de Anillo 2 que permita rollback fácil (git revert, vercel rollback).
- El UI debe manejar correctamente el caso de stream interrumpido/abandonado (timeout, cierre de pestaña).

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Plan-then-execute con pantalla aparte** | Más friccón; rompe el modelo mental de chat |
| **Plan inline pero ejecutar en background** | Pierde el feedback en tiempo real; el usuario no ve la mascota viva |
| **Sin plan, ejecutar directo** | Demasiado opaco; el usuario pierde control |

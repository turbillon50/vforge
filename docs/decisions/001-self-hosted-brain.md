# ADR-001: Brain self-hosted en Next API Route

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Forge brain (orquestador IA central de vForge)

## Contexto

El cerebro de Forge necesita un endpoint que reciba input del usuario, planee con un modelo razonador, enrute cada paso al adapter correcto, ejecute con streaming y persista audit log. Existen varios marcos para esto: LangGraph, AutoGen, CrewAI, Vercel AI SDK con tool routing, o construirlo a mano.

## Decisión

Construir el cerebro como **Next API route** en `/api/forge/run`, ejecutado en Edge Runtime, sin framework de orquestación pesado. Usar el SDK oficial de Anthropic para las llamadas a Claude y los SDK oficiales de cada proveedor para los demás adapters.

## Razón

1. **Control total** sobre la lógica de routing, memoria y permisos. Cada framework de orquestación impone abstracciones que cuestan deuda técnica al medio plazo (LangGraph state machines, AutoGen role conventions).
2. **Latencia mínima**. Edge Runtime corre cerca del usuario; los frameworks de orquestación añaden hops innecesarios.
3. **Auditabilidad**. Todo el código de routing es nuestro y se puede inspeccionar en el repo. No depende de un framework que pueda cambiar comportamiento entre versiones.
4. **Simplicidad inicial**. El cerebro v1 es básicamente: clasificador → adapter → stream. No requiere las features avanzadas (multi-agent debate, hierarchical planning) que justifican un framework.
5. **Migración futura sin lock-in**. Si en v3 necesitamos LangGraph para multi-agent, el código actual es trivial de portar.

## Consecuencias

**Fácil:**
- Inspeccionar y debuggear todo el flujo localmente.
- Ajustar la routing policy sin esperar releases de un framework.
- Mantener el bundle del backend chico.

**Difícil:**
- Reimplementar features que sí vienen "gratis" en frameworks (retry exponencial, circuit breakers, parallel tool calls). Hay que escribirlas a mano.
- Mantenimiento a largo plazo si el sistema crece a 20+ adapters.

**Deuda técnica asumida:**
- Si en v2 necesitamos parallel tool execution o agentes que se comuniquen entre sí, habrá que decidir entre extender nuestro código o migrar a un framework.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **LangGraph** | Demasiado abstracto para v1; state machines complican debugging |
| **Vercel AI SDK con tool routing** | Demasiado opinado en cómo se ven los streams; difícil meter audit log custom |
| **CrewAI / AutoGen** | Diseñado para multi-agent debate; Forge v1 es single-agent con tools |
| **OpenAI Assistants API** | Vendor lock-in con OpenAI; queremos multi-modelo desde día uno (ver ADR-005) |

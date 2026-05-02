# ADR-005: Multi-modelo desde el día uno (Anthropic + OpenAI mínimo)

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Model registry y routing policy del cerebro Forge

## Contexto

El cerebro Forge debe llamar a modelos de IA para diferentes tareas: razonamiento, edición de código, generación de imagen, transcripción de voz, búsqueda web, embedding, etc. La pregunta es si nos limitamos a un solo proveedor (más simple) o operamos multi-modelo desde el principio (más flexible).

## Decisión

**Multi-modelo desde el día uno.** En el MVP soportamos al menos:
- **Anthropic** (Claude Opus, Sonnet, Haiku) — razonamiento, código, tool use
- **OpenAI** (gpt-image-1 / DALL-E 3, Whisper) — imagen y voz

Reservamos la opción de añadir Gemini, Mistral, Llama, Replicate y otros vía OpenRouter en versiones futuras.

## Razón

1. **Cada modelo tiene su sweet spot.**
   - Claude Opus para razonamiento complejo y código largo.
   - Claude Sonnet para tareas de tool use balanceadas.
   - Claude Haiku para clasificación rápida y barata (router inicial).
   - gpt-image-1 (o sucesor) para imagen — Anthropic no genera imagen.
   - Whisper para transcripción — más barato y rápido que las alternativas.
2. **Routing inteligente es ventaja competitiva.** Un sistema que usa "el mejor modelo para cada tarea" supera a uno que usa "siempre el más caro" en costo y a uno que usa "siempre el más barato" en calidad.
3. **Resilencia.** Si un proveedor cae, podemos hacer fallback a otro para tareas no-críticas (ej. si Anthropic cae, usar GPT-4.1 para razonamiento de baja prioridad).
4. **No vendor lock-in.** Si Anthropic o OpenAI cambian precios o políticas drásticamente, podemos rebalancear sin rediseñar.
5. **Captura de mejoras del ecosistema.** Cuando salga un modelo mejor (Gemini 3, Mistral Large, etc.), agregar un adapter es trivial.

## Consecuencias

**Fácil:**
- Optimizar costo total dirigiendo tareas baratas al modelo barato (Haiku para clasificación, Sonnet para ejecución, Opus solo cuando hace falta razonar).
- Onboarding de nuevos proveedores en 1 día (un nuevo adapter).
- Comparar modelos A/B en el mismo proyecto.

**Difícil:**
- Más adapters que mantener (cada SDK cambia con el tiempo).
- El routing policy debe ser explícito y testeable (ver lib/forge/routing.ts).
- Costos en múltiples cuentas; reconciliación financiera más compleja.

**Deuda técnica asumida:**
- Hay que monitorear deprecations de cada proveedor (un modelo retired sin aviso rompe runs).
- Tests de regresión cada vez que cambia un default model.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Solo Anthropic** | No tiene generación de imagen ni transcripción de calidad |
| **Solo OpenAI** | Vendor lock-in; Claude tiene mejor tool use y razonamiento de código en estado actual |
| **OpenRouter como única capa** | Añade latencia y un punto de falla; útil como fallback, no como capa primaria |
| **Esperar a v2 para multi-modelo** | El costo de migrar después es alto; mejor pagar la complejidad ahora |

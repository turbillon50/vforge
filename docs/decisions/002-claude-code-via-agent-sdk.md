# ADR-002: Ejecución de código vía Anthropic Agent SDK + Claude Code

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Adapter de ejecución de código en el cerebro Forge

## Contexto

Cuando el plan de Forge requiere editar código (cambiar logo, refactorizar, fix de bug, agregar feature), el cerebro necesita un adapter capaz de: clonar un repo, navegar archivos, hacer ediciones consistentes, correr comandos (npm, git), abrir PRs y validar builds.

Las opciones son:
1. Implementar un agente de código a mano sobre los SDKs de modelo + tools custom.
2. Usar el **Anthropic Agent SDK + Claude Code** como subprocess.
3. Usar otra herramienta (Cursor headless, Aider, OpenAI Codex CLI).

## Decisión

Usar el **Anthropic Agent SDK con Claude Code** como adapter de ejecución de código. El brain spawnea una sesión de Claude Code con el repo montado, le pasa el sub-plan en lenguaje natural, y procesa los eventos de vuelta (commits, PRs, errores).

## Razón

1. **Validado en vivo.** Esta misma sesión de construcción del MVP fue ejecutada con Claude Code. El patrón funciona.
2. **Tools listas.** Claude Code ya maneja git, file edits, bash, GitHub MCP, todo. Reinventar eso es perder semanas.
3. **Streaming nativo.** Los eventos de Claude Code se pueden reenviar al chat de `/forge` sin re-traducir.
4. **Permisos integrados.** El sistema de modos de permiso de Claude Code se mapea naturalmente a los anillos 0–3 de vForge.
5. **Mantenido por Anthropic.** Mejoras del modelo y herramientas llegan automáticamente; no tenemos que mantenerlo nosotros.

## Consecuencias

**Fácil:**
- Cualquier tarea de "edita el repo de X" se delega al adapter sin diseñar tools nuevas.
- El audit log incluye los logs estructurados que Claude Code ya emite.
- Soporte para repos grandes (>500 archivos) sin gymnastics de contexto.

**Difícil:**
- Dependencia explícita de Anthropic. Si Anthropic cambia el SDK, hay que migrar.
- Costo: cada ejecución consume tokens de Claude Code (Sonnet o Opus). Hay que medir.

**Deuda técnica asumida:**
- Si en el futuro queremos un proveedor alternativo (ej. OpenAI Codex headless), tendremos que escribir un adapter equivalente.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Implementar agente de código a mano** | Reinventar git/file ops sería ~2 meses de trabajo redundante |
| **Cursor headless** | No existe API pública estable; orientado a UI |
| **Aider** | Maduro pero menos integrado con tools modernas (MCP, GitHub Apps) |
| **OpenAI Codex CLI** | OpenAI no tiene equivalente directo a Claude Code en madurez de tooling |

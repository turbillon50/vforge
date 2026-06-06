# VForge — Listings de marketplaces (artefactos)

Esta branch agrega los archivos necesarios para publicar VForge en:

- **Official MCP Registry** → `server.json` (namespace `site.vforge/vforge`). Requiere verificar el dominio vforge.site (TXT DNS) o usar GitHub OAuth, luego `mcp-publisher publish`.
- **Claude plugin directory (Cowork/Claude Code)** → `.claude-plugin/marketplace.json` + `plugins/vforge/`. Validar con `claude plugin validate` y subir en https://claude.ai/settings/plugins/submit.
- **Anthropic Connectors Directory** → el MCP remoto ya existe en https://vforge.site/api/mcp. PENDIENTE: migrar de Bearer estatico a OAuth 2.0/2.1 + PKCE, anotaciones de tools (title + readOnlyHint/destructiveHint), politica de privacidad publica y logo. Form: https://clau.de/mcp-directory-submission

Ver el plan ejecutivo completo para prioridades y responsables.

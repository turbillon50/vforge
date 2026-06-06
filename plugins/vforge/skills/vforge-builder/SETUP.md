---
name: vforge-setup
description: Configura el token del MCP de VForge para que el plugin funcione.
---

# Conectar VForge

El plugin VForge usa un servidor MCP remoto (https://vforge.site/api/mcp) con un token por usuario.

1. Entra a https://vforge.site y abre Ajustes → MCP.
2. Genera tu token personal (`vfmcp_...`).
3. Cuando se te pida, define la variable de entorno `VFORGE_MCP_TOKEN` con ese valor.
4. Reinicia el plugin. Claude ya podra usar las herramientas `vforge_*`.

Si el token expira, repite los pasos 2–3.

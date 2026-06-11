# Taller vs Blueprint — separación y nomenclatura (VForge)

**Fecha:** 2026-06-11
**Commit:** `5c13cf5` — feat(blueprint): unificar n8n bajo /app/blueprint + nomenclatura Taller/Blueprint consistente
**Deploy:** `dpl_N3bWzFq28iT75MFx9CXDDLABBKJ4` → **READY** en producción (vforge.site, www.vforge.site), build ~37s, región iad1.

## Concepto (aclaración de Luis)
- **TALLER** = sala de máquinas. La esfera de agentes (Claude/Codex/Grok/Browser/Shell) trabajando en tiempo real, quién construye qué AHORA. Ruta `/app/taller` (ya existía, intacta).
- **BLUEPRINT** = editor de flujos tipo n8n. El canvas con nodos donde se diseña CÓMO trabaja la empresa (procesos, automatizaciones, CRM triggers). Ruta `/app/blueprint`.
Son DOS conceptos distintos, NO se fusionan.

## (1) Unificación del concepto n8n bajo /app/blueprint
- `/app/blueprint` ahora usa el **FlowCanvas real** que vivía en `/app/flujos` — conectado al motor real `flows / flow_nodes / flow_runs` vía `/api/automatizaciones/flows*` + nodo `crm_upsert` (CRM). Antes `/app/blueprint` era un placeholder con un `<iframe src="/blueprint.html">` (eliminado).
- Las 3 rutas fragmentadas quedan unificadas con **redirect 308** (next.config.mjs, `permanent: true`):
  - `/app/flujos` → 308 → `/app/blueprint` ✅ (verificado en prod)
  - `/app/automatizaciones` → 308 → `/app/blueprint` ✅ (verificado en prod)
  - `/app/cockpit` → 308 → `/app/blueprint` ✅ (verificado en prod)
- Se eliminaron las páginas duplicadas: `app/app/flujos/page.tsx`, `app/app/automatizaciones/page.tsx`, `app/app/cockpit/page.tsx`.
- (El API `/api/automatizaciones/*` se conserva: es el motor que usa el canvas. CERO mock; daemon sin tocar.)

## (2) Nomenclatura consistente en TODOS los menús
Dos entradas separadas y claras en cada menú: **Taller** (IconCpu, /app/taller) y **Blueprint** (IconWorkflow = nodos/flujo, /app/blueprint). Quitadas las duplicadas "Flujos" y "Automatización".
- **Sidebar desktop** (WorkspaceShell): Conversación · RepoVisión · Despliegues · Navegador · **Taller** · **Blueprint** · CRM · Proyectos · Baúl · Contratos · Actividad. (Sin Flujos ni Automatización.)
- **Bottom-nav móvil**: Inicio · **Taller** · (orb) Chat · **Blueprint** · Navegador. Taller y Blueprint flanquean el orbe central.
- **Settings → MoreTools**: quitado "Centro de Mando" (→ /app/cockpit) que ahora duplicaba Blueprint.

## (3) VOrb (burbuja flotante)
Items finales: **Taller** (badge LIVE) · **Blueprint** · Hablar con V · Conversación · Navegador (+ Compartir VForge). Verificado en screenshot.

## (4) Menú fantasma / código muerto
- El único lanzador flotante es `components/workspace/VOrb.tsx`, renderizado UNA vez en WorkspaceShell. No hay segundo menú cacheado.
- "Nuevo chat" detectado en `ChatExperience.tsx` es un botón legítimo (`startNewSession`) del drawer de chat, NO un menú fantasma.
- El símbolo `VOrb` de `ThinkingIndicator.tsx` es otro componente (avatar animado con prop `size`), no el lanzador — colisión de nombre sin impacto funcional.
- **Cache-bust PWA**: `public/sw.js` VERSION `v14` → `v15-2026-06-11-taller-blueprint` para forzar invalidación y que el menú nuevo aparezca en móvil sin desinstalar. Verificado servido en prod.

## Screenshots (móvil 390×844 + sidebar desktop)
- `.taller-shots/01-bottomnav-movil.png` — bottom-nav con Taller y Blueprint
- `.taller-shots/02-vorb-movil.png` — VOrb abierto (Taller, Blueprint, Hablar con V, Conversación, Navegador)
- `.taller-shots/03-sidebar-desktop.png` / `03b-sidebar-crop.png` — sidebar con Taller y Blueprint separados

## Verificación
- `npm run build` (Node 20) ✅ compila.
- Producción: 3 redirects 308 vivos, SW v15 servido, deploy READY.

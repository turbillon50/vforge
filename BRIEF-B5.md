# BRIEF B5 — VForge: cualquier proyecto de Luis al motor vivo (28-sep-2026)

Eres el ejecutor de Vulcano en VForge. Worktree `/root/worktrees/vforge-b5`, rama `motor-todos`. Solo tocas `servicios/vivo/*`, `lib/vivo/*`, `app/api/vivo/*`, `components/studio/vivo/*` y la barra del motor en `components/live/LivePortal.tsx`. B4 trabaja en `/app/projects`: no lo toques.

## Antes de tocar código
Lee `/root/skills-vault/DOCTRINA.md` (v7) y `metodo-apps` completa (SKILL.md, MUST-500.md, SANIDAD.md, LENTES.md).

## El problema (medido por Vulcano el 28-sep)
El editor sobre preview (motor `vf-vivo`, `/opt/vf-vivo`, registro `/opt/vf-vivo/proyectos.json`) funciona: en `/app/live/mipipa` las 3 vistas cargan en 3 s y el clic en un elemento da archivo y línea. PERO solo existe `mipipa` en el registro. Luis abre cualquier otro proyecto en `/app/live/<proyecto>` y ve "Sin URL" o "todavía no está en el motor vivo". Para él eso es "ninguna mejora".

## Meta medible
Desde `/app/live/<proyecto>` de cualquier proyecto de Luis con repo en GitHub (Next.js o Vite), un botón **"Meter al motor vivo"** (solo dueño) que: clona fresco el repo en `/root/worktrees/vivo-<proyecto>`, crea la rama de trabajo `vivo/edicion` (nunca toca la de producción), instala dependencias, jala variables de desarrollo si el proyecto está en Vercel (sin commitearlas nunca), aplica la capa de edición (loader `data-vf-src`) sin ensuciar el repo del cliente, lo registra y lo enciende. La pantalla muestra el avance real por pasos (clonando, instalando, arrancando) y el error humano si falla. Probado de punta a punta con 3 proyectos reales distintos de Luis (no mipipa), con captura WebKit 1440 MIRADA de cada uno cargado y editando.

## Límites duros (el servidor anda justo)
- Disco: si quedan menos de 4 GB libres, no instala; primero libera. Máximo 4 proyectos con `node_modules` a la vez; al pasar el tope borra `node_modules` del menos usado (el worktree queda y su rama está en GitHub). Mide `df -h /` antes y después.
- RAM: el motor ya limita a 3 vivos y 1536 MB cada uno; no lo subas.
- Secretos: el `.env.local` de desarrollo vive solo en el worktree, en `.gitignore`, y nunca en logs ni en el repo de VForge.
- El alta corre en el servidor (el relay o el propio motor), nunca comandos libres: lista blanca como en `vl-control`.

## Cómo trabajas
- Node 20, commits firmados `turbillon50 <turbillon50@gmail.com>`, push a `origin motor-todos` al cerrar cada bloque. NO empujes a main: Vulcano revisa y sube.
- Cambios del motor (`/opt/vf-vivo`) también van en `servicios/vivo/` del repo; reinicia `vf-vivo` solo cuando no haya nada editándose y deja constancia.
- Sin `next build` local de VForge. `npx tsc --noEmit -p .` en 0 y `npm test`.
- Pruebas con Playwright WebKit y sesión real (patrón `/root/vulcano-audit/vforge-rescate/sala_vivo.py`).
- Lista maestra `LISTA-B5.md`, `[x]` solo con evidencia. `DONE-B5` al terminar.

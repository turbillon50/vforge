---
name: frontend-ship
description: Producir frontends PREMIUM (anti "AI slop") y desplegarlos de verdad — repo en GitHub + deploy en Vercel — de spec/referencia a URL pública. ACTIVAR cuando Luis pida una web, landing, dashboard, app o PWA y mencione "bonito", "premium", "que se vea caro", "que parezca de $50k", "estilo Apple / Linear / Stripe / Notion / Arc / Raycast / Vercel", "para mostrar al cliente", "para vender"; o cuando pida "crea el repo", "súbelo a Vercel", "despliega", "publícalo"; o cuando un frontend ya entregado se vea genérico, plano o aburrido y haya que subir la calidad. También activar en modo APRENDIZAJE de frontend (estamos aprendiendo a hacerlos). NO usar para backend puro, scripts, data o lógica sin UI.
---

# frontend-ship — Frontends que no dan pena, desplegados de verdad

Esta skill nace de una regada real (proyecto **iStore Pro**): se entregó un dashboard oscuro correcto pero **plano, genérico y sin alma** — exactamente el "AI slop" que `frontend-design` dice evitar. Luis es diseñador; un frontend "competente pero del montón" **no es entregable**.

> **Regla cero:** si el resultado podría pasar por "plantilla gratis de dashboard", NO está listo. Punto.

---

## Capacidad real (confirmada, no teórica)

- **Repo GitHub:** relay Hetzner con `gh` autenticado como `turbillon50`. → `gh repo create turbillon50/NOMBRE --private --source=. --push`.
- **Deploy Vercel:** conector Vercel MCP (`list_projects`, `get_project`, `list_deployments`, `deploy_to_vercel`, logs) **+** `VERCEL_TOKEN` en `/home/secrets/global/.env`, Node v20 en el server → `npx vercel --prod --token $VERCEL_TOKEN`. También integración Git de Vercel.
- **Assets visuales:** **HIGGSFIELD** (genera hero shots, mockups, texturas, fondos), **image_search** / **Exa** (refs e imágenes reales).
- **Diseño:** `frontend-design` (anti-slop) + `visual-fidelity` / `design-fidelity` (calcar referencia sin reinterpretar — Luis es el director, Claude el ejecutor).
- **Demo rápida clickable:** artifact React en el chat (se renderiza vivo). Para repo desplegable: Next.js + Tailwind + shadcn.

---

## Paso 0 — OBLIGATORIO: fijar dirección estética antes de teclear

No se escribe una línea de UI sin esto. Saltárselo fue lo que mató a iStore Pro.

1. **¿Hay referencia (foto/captura)?**
   - Sí → **CALCARLA** con `visual-fidelity`. No reinterpretar, no "mejorar" a gusto propio. Reproducir densidad, jerarquía, sombras, color.
   - Si la referencia y el spec **chocan** (ej. referencia clara vs. spec dark #0A0A0A) → **PREGUNTAR cuál manda en UNA línea** antes de quemar la corrida. Esa mezcla silenciosa fue el error.
2. **¿No hay referencia?** → comprometerse a **UNA dirección extrema** (minimal brutal, glass espacial iOS 26, editorial, etc.). El promedio seguro = aburrido = rechazado.
3. Anclar a los referentes que pide Luis (Apple / Linear / Stripe / Arc / Raycast / Vercel) con decisiones concretas, no como adorno.

---

## Quality gate anti-slop (revisar ANTES de entregar)

Marcar cada punto. Si falla uno, no se entrega:

- [ ] **Profundidad:** nada de fills planos. Capas, sombras suaves grandes, highlight de 1px arriba, gradientes/mesh, textura o grain sutil. La planicie es el sello del slop.
- [ ] **Tipografía con carácter:** display distintivo (NUNCA Inter/Roboto/Arial/system; tampoco caer siempre en Space Grotesk). Números **tabulares** grandes en KPIs.
- [ ] **Color con firma:** un acento dominante (idealmente un gradiente de marca) usado con intención. No gris sobre gris tímido.
- [ ] **Layout con punto de vista:** bento, asimetría, números hero grandes, densidad controlada. No grid uniforme de cards idénticas.
- [ ] **Data viz viva:** áreas con gradiente + glow, trazos gruesos, donas con métrica al centro. No líneas grises tristes.
- [ ] **Microinteracciones:** hover lift + glow, transiciones, un page-load con stagger. Glass/frost en chrome (sidebar/topbar).
- [ ] **Datos plausibles:** nombres latinos, MXN realistas ($2,900 no $12.34), fechas recientes, pantallas que parezcan reales.
- [ ] **Prueba final:** ¿pasaría por template gratis? Si sí → reprobado.

---

## Pipeline de entrega (de spec a URL)

1. **Dirección estética** (Paso 0) + generar assets con HIGGSFIELD si hace falta hero/fondos/mockups.
2. **Build:** artifact React para demo clickable inmediata, **o** Next.js + Tailwind + shadcn para repo desplegable.
3. **Quality gate** completo.
4. **Repo** (script al relay en **base64**):
   `mkdir -p /tmp/proj && ... && cd /tmp/proj && git init && gh repo create turbillon50/NOMBRE --private --source=. --push`
5. **Deploy:** vincular a Vercel (Git integration) o `cd /tmp/proj && npx vercel --prod --token $VERCEL_TOKEN`. Inyectar env vars con `secret-injector` solo si la build las exige (en demo pura, no).
6. **Reportar:** URL de preview + URL del repo. Verificar que carga (`web_fetch_vercel_url`).
7. **Eval loop:** registrar en Brain → `INSERT INTO skill_runs (skill_name, project_id, resultado, que_funciono, que_salio_mal)`.

---

## Modo aprendizaje (estamos aprendiendo frontend)

- Iterar **contra la referencia**, no contra el gusto propio.
- Feedback temprano: 1 pregunta clave sobre la dirección **antes** de la corrida completa, nunca a mitad ni después.
- Guardar cada lección nueva aquí o en `skill_mutations`. La skill mejora con cada proyecto.

---

## Errores conocidos (de la sesión iStore Pro)

- ❌ Mezclar dark del spec con referencia clara sin avisar. → Confirmar cuál manda.
- ❌ Decir "listo" sin pasar el quality gate.
- ❌ Bordes grises finos + cards planas = muerte por aburrimiento.
- ❌ Tener HIGGSFIELD, frontend-design y visual-fidelity y **no usarlos**.
- ❌ Tratar una demo como "se ve, ya". Para Luis (diseñador) la vara es producto terminado, no maqueta.

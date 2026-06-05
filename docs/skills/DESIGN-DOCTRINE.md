# Doctrina de diseño VForge (obligatoria — viene del Brain de V)

Fuente: skills `frontend-ship`, `design-system`, `framer-motion`, `visual-fidelity` del Brain.

## Regla cero
Si el resultado podría pasar por "plantilla gratis de dashboard", NO está listo.

## Quality gate anti-slop (todo entregable debe pasar TODOS):
1. PROFUNDIDAD: nada de fills planos. Capas, sombras suaves grandes, highlight 1px arriba (inset), gradientes/mesh, grain sutil.
2. TIPOGRAFÍA CON CARÁCTER: display distintivo, números tabulares en KPIs/métricas.
3. COLOR CON FIRMA: el gradiente violeta→cian de VForge usado con intención. No gris tímido.
4. LAYOUT CON PUNTO DE VISTA: bento, asimetría, números hero grandes, densidad controlada. NO grid uniforme de cards idénticas.
5. MICROINTERACCIONES: hover lift + glow, page-load con stagger, glass en chrome.
6. DATOS PLAUSIBLES: nombres reales, MXN realistas, fechas recientes.

## Dirección fija (Luis): Apple TV + Make.com
- Full-bleed cinematográfico, tipografía gigante limpia, filas/carruseles snap.
- Áreas de trabajo: lenguaje Make (nodos, conexiones, canvas).
- Móvil y desktop con la misma importancia. Contraste AA en claro y oscuro.

## Performance (framer-motion skill)
- Solo animar transform/opacity. Nunca width/height/top/left.
- Máx 5 animaciones simultáneas en móvil. `once: true` en scroll. 150-400ms ease-out.
- Easing firma: cubic-bezier(0.22, 1, 0.36, 1).

## UX
- Spacing múltiplos de 4px. Touch targets ≥44px. Contraste ≥4.5:1. Máx 3 colores principales por pantalla.

## Visual fidelity
Luis es diseñador y director: su diseño es la verdad. Si referencia y spec chocan, preguntar UNA línea antes de quemar la corrida.

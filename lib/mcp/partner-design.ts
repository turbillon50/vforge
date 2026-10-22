/** Criterio de diseño VForge: ATELIER es referencia visual, no plantilla. */
export function designPlan(description: string) {
  const business = description.toLowerCase();
  const type = /crm|admin|erp|factur|gesti[oó]n|inventario|obra|empresa/.test(business) ? "admin"
    : /landing|institucional|promoci[oó]n|portafolio/.test(business) ? "landing"
    : /tienda|e.?commerce|carrito|compras/.test(business) ? "tienda" : "consumo";
  const navigation = {
    admin: "Topbar fija + sidebar colapsable en escritorio; header fijo con usuario y hamburguesa en móvil, tab bar sólo si facilita tareas habituales.",
    landing: "Header fijo, navegación horizontal en escritorio y hamburguesa en móvil, sin tab bar innecesaria.",
    tienda: "Header fijo con menú y usuario; móvil con tab bar Inicio, Buscar, Carrito, Cuenta; desktop con búsqueda y categorías.",
    consumo: "Header fijo con usuario y hamburguesa, tab bar fija de 3 a 5 destinos en móvil, escritorio con navegación proporcional.",
  }[type];
  return {
    tipo: type,
    referencia: "ATELIER: elegancia editorial, jerarquía, espacios proporcionados, simplicidad y componentes compactos; nunca copiar colores o negocio automáticamente.",
    navegacion: navigation,
    reglas: [
      "Diseño Craft propio de la marca, alto contraste, iconos SVG consistentes, textos legibles y sin tarjetas gigantes.",
      "Splash breve y elegante si la carga lo requiere; respetar prefers-reduced-motion.",
      "Carruseles táctiles deslizables donde ayuden a explorar, no dentro de tablas o formularios.",
      "Respetar safe-area, teclado, scroll, navegación, estados vacíos, errores y carga.",
      "Móvil 360/390 px; escritorio 1280/1440 px. Revisar pantallas reales antes de declarar listo.",
      "Cada botón debe responder. Los datos demo se identifican, nunca se hacen pasar por operaciones reales.",
      "No Figma ni Canva; Higgsfield sin cuota, no depender de él."
    ],
    verificacion: ["Móvil", "Escritorio", "PWA instalable", "Rutas y botones", "Auth y roles", "Persistencia", "Build y HTTPS"],
    criterio_de_entrega: "Sin evidencia visual y funcional, el estado es PENDIENTE, aunque el build sea verde.",
  };
}

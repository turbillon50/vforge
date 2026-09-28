/**
 * Capa de edición sobre la vista previa viva.
 *
 * Corre DENTRO del iframe del preview (la inyecta la pasarela vf-vivo, así el
 * proyecto piloto no necesita saber que existe). Sólo aparece en el preview vivo:
 * nunca se sirve en producción porque quien la inyecta es el motor de dev.
 *
 * Qué hace:
 *   · al pasar el mouse, resalta el elemento y dice qué es
 *   · al hacer clic, lo selecciona y le avisa al Estudio (postMessage) con su
 *     archivo:línea (data-vf-src) y sus estilos actuales
 *   · el Estudio manda de vuelta el texto nuevo / estilo nuevo y aquí se pinta
 *     de inmediato para que se sienta instantáneo; el cambio real lo escribe el
 *     Estudio en el código y llega solo por recarga en caliente
 */
(function () {
  if (window.__vfVivoOverlay) return;
  window.__vfVivoOverlay = true;

  var ORIGENES_PERMITIDOS = [
    "https://vforge.site",
    "http://localhost:3000",
  ];

  function origenPermitido(origen) {
    if (ORIGENES_PERMITIDOS.indexOf(origen) !== -1) return true;
    // Previews de Vercel del propio VForge.
    return /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origen) ||
      /^https:\/\/[a-z0-9-]+\.vforge\.site$/.test(origen);
  }

  var activo = false;
  var seleccionado = null;
  var ultimoSrc = null;
  var padre = window.parent;

  // ── Pintura del resaltado ────────────────────────────────────────────────
  var capa = document.createElement("div");
  capa.setAttribute("data-vf-overlay", "");
  capa.style.cssText = [
    "position:fixed", "inset:0", "pointer-events:none", "z-index:2147483000",
    "display:none",
  ].join(";");

  var marcoHover = document.createElement("div");
  marcoHover.style.cssText =
    "position:absolute;border:1.5px solid #6d28d9;background:rgba(109,40,217,.10);border-radius:3px;transition:all .06s linear;display:none";

  var marcoSel = document.createElement("div");
  marcoSel.style.cssText =
    "position:absolute;border:2px solid #22c55e;border-radius:3px;display:none";

  var etiqueta = document.createElement("div");
  etiqueta.style.cssText = [
    "position:absolute", "font:600 10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace",
    "background:#6d28d9", "color:#fff", "padding:2px 6px", "border-radius:3px",
    "white-space:nowrap", "display:none", "max-width:80vw", "overflow:hidden",
    "text-overflow:ellipsis",
  ].join(";");

  capa.appendChild(marcoHover);
  capa.appendChild(marcoSel);
  capa.appendChild(etiqueta);

  function montarCapa() {
    if (document.body && !capa.isConnected) document.body.appendChild(capa);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", montarCapa);
  } else {
    montarCapa();
  }

  function marcar(marco, el) {
    if (!el) { marco.style.display = "none"; return null; }
    var r = el.getBoundingClientRect();
    marco.style.display = "block";
    marco.style.left = r.left + "px";
    marco.style.top = r.top + "px";
    marco.style.width = r.width + "px";
    marco.style.height = r.height + "px";
    return r;
  }

  // ── Qué elemento es "editable" ───────────────────────────────────────────
  function conFuente(el) {
    var actual = el;
    while (actual && actual !== document.body) {
      if (actual.hasAttribute && actual.hasAttribute("data-vf-src")) return actual;
      actual = actual.parentElement;
    }
    return null;
  }

  function textoPropio(el) {
    // Sólo el texto directo del elemento, sin lo de sus hijos-elemento.
    var salida = "";
    for (var i = 0; i < el.childNodes.length; i += 1) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) salida += n.nodeValue;
    }
    return salida.trim();
  }

  function retrato(el) {
    var cs = getComputedStyle(el);
    return {
      src: el.getAttribute("data-vf-src"),
      etiqueta: el.tagName.toLowerCase(),
      clase: el.getAttribute("class") || "",
      texto: textoPropio(el),
      tieneTextoPropio: textoPropio(el).length > 0,
      estilos: {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        textAlign: cs.textAlign,
        padding: cs.padding,
        margin: cs.margin,
        borderRadius: cs.borderRadius,
      },
      caja: (function () {
        var r = el.getBoundingClientRect();
        return { ancho: Math.round(r.width), alto: Math.round(r.height) };
      })(),
    };
  }

  function avisar(tipo, datos) {
    if (!padre || padre === window) return;
    try {
      padre.postMessage(Object.assign({ canal: "vf-vivo", tipo: tipo }, datos), "*");
    } catch (e) {
      /* el Estudio no está escuchando */
    }
  }

  // ── Interacción ──────────────────────────────────────────────────────────
  function alMover(ev) {
    if (!activo) return;
    var el = conFuente(ev.target);
    if (!el || el === seleccionado) {
      marcoHover.style.display = "none";
      etiqueta.style.display = "none";
      return;
    }
    var r = marcar(marcoHover, el);
    if (!r) return;
    var src = el.getAttribute("data-vf-src") || "";
    etiqueta.textContent = el.tagName.toLowerCase() + " · " + src.split("/").pop();
    etiqueta.style.display = "block";
    var arriba = r.top > 20;
    etiqueta.style.left = Math.max(2, r.left) + "px";
    etiqueta.style.top = (arriba ? r.top - 18 : r.bottom + 4) + "px";
  }

  function alClic(ev) {
    if (!activo) return;
    var el = conFuente(ev.target);
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    seleccionar(el);
  }

  function seleccionar(el) {
    seleccionado = el;
    ultimoSrc = el.getAttribute("data-vf-src");
    marcoHover.style.display = "none";
    marcar(marcoSel, el);
    avisar("seleccion", { elemento: retrato(el) });
  }

  function limpiarSeleccion() {
    seleccionado = null;
    marcoSel.style.display = "none";
    etiqueta.style.display = "none";
    marcoHover.style.display = "none";
  }

  function reposicionar() {
    if (seleccionado && seleccionado.isConnected) marcar(marcoSel, seleccionado);
    else if (seleccionado) limpiarSeleccion();
  }

  document.addEventListener("mousemove", alMover, true);
  document.addEventListener("click", alClic, true);
  window.addEventListener("scroll", reposicionar, true);
  window.addEventListener("resize", reposicionar);

  // Tras una recarga en caliente el nodo viejo muere: recupera la selección
  // buscando el mismo data-vf-src y avisa al Estudio si ya no existe.
  setInterval(function () {
    if (!activo) return;
    if (seleccionado && !seleccionado.isConnected && ultimoSrc) {
      var reemplazo = document.querySelector('[data-vf-src="' + ultimoSrc.replace(/"/g, '\\"') + '"]');
      if (reemplazo) { seleccionar(reemplazo); return; }
      limpiarSeleccion();
      avisar("seleccion-perdida", {});
    }
    if (seleccionado) reposicionar();
  }, 400);

  // ── Órdenes que llegan del Estudio ───────────────────────────────────────
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.canal !== "vf-vivo-estudio") return;
    if (!origenPermitido(ev.origin)) return;

    if (d.tipo === "modo") {
      activo = Boolean(d.activo);
      capa.style.display = activo ? "block" : "none";
      if (!activo) limpiarSeleccion();
      avisar("modo", { activo: activo });
      return;
    }

    if (d.tipo === "vista-previa" && seleccionado) {
      // Pinta el cambio al instante (optimista) mientras el código se escribe.
      if (d.texto != null) {
        for (var i = 0; i < seleccionado.childNodes.length; i += 1) {
          var n = seleccionado.childNodes[i];
          if (n.nodeType === 3 && n.nodeValue.trim()) { n.nodeValue = d.texto; break; }
        }
      }
      if (d.estilos) {
        for (var k in d.estilos) {
          if (Object.prototype.hasOwnProperty.call(d.estilos, k)) {
            seleccionado.style[k] = d.estilos[k];
          }
        }
      }
      reposicionar();
      return;
    }

    if (d.tipo === "limpiar") { limpiarSeleccion(); return; }

    if (d.tipo === "ping") {
      avisar("pong", { listo: true, marcados: document.querySelectorAll("[data-vf-src]").length });
    }
  });

  avisar("listo", { marcados: document.querySelectorAll("[data-vf-src]").length });
})();

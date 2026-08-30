(function () {
  "use strict";
  if (window.__vforge_inspector) return;
  window.__vforge_inspector = true;

  const STATE = { active: false, outline: null };

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
    let node = el;
    for (let i = 0; i < 5 && node && node.nodeType === 1; i += 1) {
      if (node.id) {
        parts.unshift("#" + node.id.replace(/[^\w-]/g, ""));
        break;
      }
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
      const idx = same.indexOf(node) + 1;
      parts.unshift(same.length > 1 ? tag + ":nth-of-type(" + idx + ")" : tag);
      node = parent;
    }
    return parts.join(" > ").slice(0, 240);
  }

  function ensureBtn() {
    if (document.getElementById("vforge-btn")) return;
    const btn = document.createElement("button");
    btn.id = "vforge-btn";
    btn.type = "button";
    btn.title = "VForge Inspector (Alt+Shift+V)";
    btn.textContent = "V";
    btn.addEventListener("click", toggle);
    document.documentElement.appendChild(btn);
  }

  function toggle() {
    STATE.active = !STATE.active;
    const btn = document.getElementById("vforge-btn");
    document.documentElement.classList.toggle("vforge-active", STATE.active);
    if (btn) btn.classList.toggle("vforge-btn-on", STATE.active);
    if (STATE.active) {
      STATE.outline = document.createElement("div");
      STATE.outline.id = "vforge-hover-outline";
      document.documentElement.appendChild(STATE.outline);
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
    } else {
      if (STATE.outline) STATE.outline.remove();
      STATE.outline = null;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
    }
  }

  function onMove(e) {
    if (!STATE.outline) return;
    if (e.target.closest && e.target.closest("#vforge-btn, .vforge-mini-panel")) return;
    const rect = e.target.getBoundingClientRect();
    STATE.outline.style.top = rect.top + window.scrollY + "px";
    STATE.outline.style.left = rect.left + window.scrollX + "px";
    STATE.outline.style.width = rect.width + "px";
    STATE.outline.style.height = rect.height + "px";
  }

  function onClick(e) {
    if (!STATE.active) return;
    if (e.target.closest && e.target.closest("#vforge-btn, .vforge-mini-panel")) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    const selector = cssPath(el);
    document.querySelectorAll(".vforge-mini-panel").forEach((n) => n.remove());
    const panel = document.createElement("div");
    panel.className = "vforge-mini-panel";
    panel.innerHTML =
      '<div class="vforge-mini-panel-header">' +
      selector +
      "</div>" +
      '<textarea rows="3" placeholder="Qué ves / qué está mal"></textarea>' +
      '<div class="vforge-mini-panel-actions">' +
      '<button type="button" class="vforge-send">Fotografiar y mandar</button>' +
      '<button type="button" class="vforge-cancel">Cancelar</button>' +
      "</div>";
    document.documentElement.appendChild(panel);
    const rect = el.getBoundingClientRect();
    panel.style.top = rect.bottom + window.scrollY + 8 + "px";
    panel.style.left = Math.max(8, rect.left + window.scrollX) + "px";
    const ta = panel.querySelector("textarea");
    ta.focus();
    panel.querySelector(".vforge-cancel").addEventListener("click", () => panel.remove());
    panel.querySelector(".vforge-send").addEventListener("click", () => {
      const note = ta.value.trim();
      const send = panel.querySelector(".vforge-send");
      send.disabled = true;
      send.textContent = "Mandando…";
      chrome.runtime.sendMessage(
        { type: "photograph", selector, note, url: location.href },
        (res) => {
          if (res && res.ok) {
            send.textContent = "Enviado";
            setTimeout(() => panel.remove(), 700);
          } else {
            send.disabled = false;
            send.textContent = res && res.error ? res.error : "Falló";
          }
        },
      );
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.key === "V" || e.key === "v")) toggle();
  });
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "toggle_inspector") toggle();
  });
  if (document.body) ensureBtn();
  else document.addEventListener("DOMContentLoaded", ensureBtn);
})();

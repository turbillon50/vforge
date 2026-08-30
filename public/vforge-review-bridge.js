(function () {
  "use strict";
  if (window === window.parent) return;

  var queued = false;
  function emitViewport() {
    queued = false;
    var root = document.documentElement;
    var body = document.body;
    var documentWidth = Math.max(
      root ? root.scrollWidth : 0,
      body ? body.scrollWidth : 0,
      window.innerWidth
    );
    var documentHeight = Math.max(
      root ? root.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      window.innerHeight
    );
    window.parent.postMessage(
      {
        source: "vforge-review-bridge",
        type: "viewport",
        version: 1,
        scrollX: Math.max(0, window.scrollX || 0),
        scrollY: Math.max(0, window.scrollY || 0),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: documentWidth,
        documentHeight: documentHeight,
      },
      "*"
    );
  }

  function cssPath(el) {
    if (!el || el.nodeType !== 1) return "";
    var parts = [];
    var node = el;
    for (var i = 0; i < 6 && node && node.nodeType === 1; i += 1) {
      if (node.id) {
        parts.unshift("#" + String(node.id).replace(/[^\w-]/g, ""));
        break;
      }
      var tag = node.tagName.toLowerCase();
      var parent = node.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      var same = [];
      for (var c = 0; c < parent.children.length; c += 1) {
        if (parent.children[c].tagName === node.tagName) same.push(parent.children[c]);
      }
      var idx = same.indexOf(node) + 1;
      parts.unshift(same.length > 1 ? tag + ":nth-of-type(" + idx + ")" : tag);
      if (tag === "body" || tag === "html") break;
      node = parent;
    }
    return parts.join(" > ").slice(0, 300);
  }

  function emitHit(xRatio, yRatio) {
    var x = Math.min(1, Math.max(0, Number(xRatio) || 0)) * window.innerWidth;
    var y = Math.min(1, Math.max(0, Number(yRatio) || 0)) * window.innerHeight;
    var el = document.elementFromPoint(x, y);
    var text = "";
    if (el && el.textContent) text = String(el.textContent).replace(/\s+/g, " ").trim().slice(0, 80);
    window.parent.postMessage(
      {
        source: "vforge-review-bridge",
        type: "hit",
        version: 1,
        selector: cssPath(el),
        text: text,
        documentX: Math.round((window.scrollX + x) * 100) / 100,
        documentY: Math.round((window.scrollY + y) * 100) / 100,
      },
      "*"
    );
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(emitViewport);
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "vforge-review-host" || data.type !== "hit") return;
    emitHit(data.x, data.y);
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("load", schedule, { once: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
  }
  if (typeof ResizeObserver !== "undefined" && document.documentElement) {
    new ResizeObserver(schedule).observe(document.documentElement);
  }
  schedule();
})();

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

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(emitViewport);
  }

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

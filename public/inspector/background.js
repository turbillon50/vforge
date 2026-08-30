const DEFAULTS = {
  origin: "https://vforge.site",
  projectId: "",
  token: "",
};

async function getConfig() {
  const { config = {} } = await chrome.storage.local.get("config");
  return { ...DEFAULTS, ...config };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab || null;
}

async function captureTab(windowId) {
  return chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 72 });
}

async function postEye(image, extra = {}) {
  const cfg = await getConfig();
  if (!cfg.projectId || !cfg.token) {
    throw new Error("Falta project_id o token MCP en el panel");
  }
  if (!cfg.token.startsWith("vfmcp_")) {
    throw new Error("El token debe ser vfmcp_… no el secret del relay");
  }
  const origin = String(cfg.origin || DEFAULTS.origin).replace(/\/$/, "");
  const res = await fetch(`${origin}/api/live/${encodeURIComponent(cfg.projectId)}/eyes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`,
    },
    body: JSON.stringify({
      image,
      source: "plugin",
      url: extra.url || "",
      selector: extra.selector || "",
      note: extra.note || "",
      viewport: extra.viewport || "desktop",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function processCapture(extra) {
  const tab = extra.tab || (await activeTab());
  if (!tab || tab.windowId == null) {
    throw new Error("No hay pestaña visible");
  }
  const image = await captureTab(tab.windowId);
  if (!image || !image.startsWith("data:image/")) {
    throw new Error("Chrome no fotografió la pestaña");
  }
  return postEye(image, {
    url: extra.url || tab.url || "",
    selector: extra.selector || "",
    note: extra.note || "",
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "photograph") {
    processCapture({
      tab: sender.tab,
      url: msg.url || "",
      selector: msg.selector || "",
      note: msg.note || "",
    })
      .then((data) => sendResponse({ ok: true, id: data.id }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return false;
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.commands &&
  chrome.commands.onCommand.addListener((command) => {
    if (command !== "toggle-inspector") return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "toggle_inspector" });
      }
    });
  });

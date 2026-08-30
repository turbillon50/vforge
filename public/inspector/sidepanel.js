async function loadConfig() {
  const { config = {} } = await chrome.storage.local.get("config");
  document.getElementById("cfg-origin").value = config.origin || "https://vforge.site";
  document.getElementById("cfg-project").value = config.projectId || "";
  document.getElementById("cfg-token").value = config.token || "";
}

document.getElementById("save-config").addEventListener("click", async () => {
  const config = {
    origin: document.getElementById("cfg-origin").value.trim() || "https://vforge.site",
    projectId: document.getElementById("cfg-project").value.trim(),
    token: document.getElementById("cfg-token").value.trim(),
  };
  await chrome.storage.local.set({ config });
  const el = document.getElementById("save-feedback");
  el.textContent = "Guardado";
  setTimeout(() => {
    el.textContent = "";
  }, 1600);
});

document.getElementById("shot").addEventListener("click", () => {
  const el = document.getElementById("shot-feedback");
  el.textContent = "Fotografiando…";
  chrome.runtime.sendMessage({ type: "photograph" }, (res) => {
    el.textContent = res && res.ok ? "Foto en la sala. Dile a la IA: mira este proyecto." : (res && res.error) || "Falló";
  });
});

loadConfig();

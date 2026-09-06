let francoDeferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  francoDeferredInstallPrompt = event;
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.classList.remove("hidden");
});

document.addEventListener("click", async (event) => {
  if (event.target?.id !== "installAppBtn" || !francoDeferredInstallPrompt) return;
  francoDeferredInstallPrompt.prompt();
  await francoDeferredInstallPrompt.userChoice;
  francoDeferredInstallPrompt = null;
  event.target.classList.add("hidden");
});

window.addEventListener("appinstalled", () => {
  francoDeferredInstallPrompt = null;
  document.getElementById("installAppBtn")?.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(console.warn);
  });
}

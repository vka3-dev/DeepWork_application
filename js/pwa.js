(() => {
  let deferredInstallPrompt = null;
  let installButton = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function createInstallButton() {
    if (installButton || isStandalone()) return;

    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.textContent = "Install DeepWork";
    installButton.setAttribute("aria-label", "Install DeepWork application");
    Object.assign(installButton.style, {
      position: "fixed",
      right: "20px",
      bottom: "84px",
      zIndex: "1000",
      display: "none",
      padding: "10px 16px",
      border: "1px solid #60A5FA",
      borderRadius: "10px",
      background: "#3B82F6",
      color: "#09090B",
      fontFamily: "Inter, sans-serif",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)"
    });

    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      installButton.style.display = "none";
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
    });

    document.body.appendChild(installButton);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js")
        .catch((error) => console.error("DeepWork service worker registration failed:", error));
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    createInstallButton();
    if (installButton) installButton.style.display = "block";
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installButton) installButton.remove();
    installButton = null;
  });

  document.addEventListener("DOMContentLoaded", createInstallButton);
})();

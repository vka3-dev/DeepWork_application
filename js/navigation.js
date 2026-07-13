(() => {
    "use strict";

    const storage = window.DeepWorkStorage;
    const auth = window.DeepWorkAuth;

    if (!storage || !auth) {
        console.error("DeepWork navigation could not be initialized.");
        return;
    }

    function getTimerLinks() {
        return Array.from(document.querySelectorAll('a[href="focus-timer.html"]'));
    }

    function removeIndicators() {
        document.querySelectorAll("[data-active-focus-indicator]").forEach((indicator) => {
            indicator.remove();
        });
    }

    function updateActiveFocusIndicator() {
        removeIndicators();

        if (!storage.getActiveSession()) {
            return;
        }

        getTimerLinks().forEach((link) => {
            const indicator = document.createElement("span");
            indicator.dataset.activeFocusIndicator = "true";
            indicator.className = "inline-block w-2 h-2 rounded-full bg-primary shrink-0";
            indicator.setAttribute("aria-label", "Focus session active");
            indicator.title = "Focus session active";
            link.appendChild(indicator);
        });
    }

    function addLogoutControls() {
        document.querySelectorAll("nav").forEach((nav) => {
            if (nav.querySelector("[data-deepwork-logout]")) {
                return;
            }

            const button = document.createElement("button");
            button.type = "button";
            button.dataset.deepworkLogout = "true";
            button.className = "flex items-center justify-center gap-stack-sm text-secondary hover:text-primary transition-all active:scale-90";
            button.setAttribute("aria-label", "Logout");
            button.title = "Logout";
            button.innerHTML = `
                <span class="material-symbols-outlined">logout</span>
                <span class="font-label-sm text-[10px] md:text-label-md">Logout</span>
            `;
            button.addEventListener("click", auth.logout);
            nav.appendChild(button);
        });
    }

    window.addEventListener("deepwork:active-session-changed", updateActiveFocusIndicator);
    window.addEventListener("storage", (event) => {
        if (event.key === storage.ACTIVE_SESSION_KEY) {
            updateActiveFocusIndicator();
        }
    });

    addLogoutControls();
    updateActiveFocusIndicator();
})();

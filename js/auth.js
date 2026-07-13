(() => {
    "use strict";

    const ACCESS_TOKEN_KEY = "deepwork_access_token";
    const api = window.DeepWorkAPI;
    const storage = window.DeepWorkStorage;

    function getAccessToken() {
        try {
            return localStorage.getItem(ACCESS_TOKEN_KEY);
        } catch {
            return null;
        }
    }

    function saveAccessToken(token) {
        if (typeof token !== "string" || !token) {
            return false;
        }

        try {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            return true;
        } catch {
            return false;
        }
    }

    function clearAccessToken() {
        try {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch {
            // Authentication is still treated as cleared in memory/navigation flow.
        }
    }

    function isAuthenticated() {
        return Boolean(getAccessToken());
    }

    async function login(email, password) {
        const response = await api.login(email, password);

        if (!saveAccessToken(response.accessToken)) {
            throw new Error("Unable to save authentication state.");
        }

        return response;
    }

    async function register(email, password) {
        await api.register(email, password);
        return login(email, password);
    }

    function clearPrivateLocalState() {
        clearAccessToken();
        storage?.clearActiveSession();
    }

    function logout() {
        clearPrivateLocalState();
        window.location.replace("auth.html");
    }

    async function requireAuthenticatedUser() {
        if (!isAuthenticated()) {
            logout();
            return null;
        }

        try {
            return await api.getCurrentUser();
        } catch (error) {
            if (error.status === 401) {
                clearPrivateLocalState();
                window.location.replace("auth.html");
                return null;
            }

            console.error("DeepWork could not verify the current user.", error);
            return null;
        }
    }

    function getFriendlyAuthError(error) {
        if (error?.isNetworkError) {
            return "Unable to connect to DeepWork API.";
        }

        if (error?.status === 401) {
            return "Invalid email or password.";
        }

        if (error?.status === 409) {
            return "An account with this email already exists.";
        }

        if (error?.status === 422) {
            return "Enter a valid email and use a password with at least 8 characters.";
        }

        return "Something went wrong. Please try again.";
    }

    function initializeAuthPage() {
        const form = document.getElementById("auth-form");

        if (!form) {
            return;
        }

        if (isAuthenticated()) {
            api.getCurrentUser()
                .then(() => window.location.replace("calendar.html"))
                .catch((error) => {
                    if (error?.status === 401) {
                        clearPrivateLocalState();
                    }
                });
        }

        const title = document.getElementById("auth-title");
        const subtitle = document.getElementById("auth-subtitle");
        const submitButton = document.getElementById("auth-submit");
        const modeButton = document.getElementById("auth-mode-toggle");
        const modePrompt = document.getElementById("auth-mode-prompt");
        const errorBox = document.getElementById("auth-error");
        const emailInput = document.getElementById("auth-email");
        const passwordInput = document.getElementById("auth-password");

        let mode = "login";
        let submitting = false;

        function renderMode() {
            const isLogin = mode === "login";
            title.textContent = isLogin ? "Welcome back" : "Create your account";
            subtitle.textContent = isLogin
                ? "Enter DeepWork and continue your focus."
                : "Create a private DeepWork workspace.";
            submitButton.textContent = isLogin ? "Login" : "Register";
            modePrompt.textContent = isLogin ? "New to DeepWork?" : "Already have an account?";
            modeButton.textContent = isLogin ? "Register" : "Login";
            errorBox.textContent = "";
            errorBox.classList.add("hidden");
        }

        modeButton.addEventListener("click", () => {
            mode = mode === "login" ? "register" : "login";
            renderMode();
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (submitting) {
                return;
            }

            submitting = true;
            submitButton.disabled = true;
            errorBox.classList.add("hidden");

            try {
                const email = emailInput.value.trim();
                const password = passwordInput.value;

                if (mode === "login") {
                    await login(email, password);
                } else {
                    await register(email, password);
                }

                window.location.replace("calendar.html");
            } catch (error) {
                errorBox.textContent = getFriendlyAuthError(error);
                errorBox.classList.remove("hidden");
            } finally {
                submitting = false;
                submitButton.disabled = false;
            }
        });

        renderMode();
    }

    window.addEventListener("deepwork:unauthorized", () => {
        if (!document.getElementById("auth-form")) {
            clearPrivateLocalState();
            window.location.replace("auth.html");
        }
    });

    window.DeepWorkAuth = {
        ACCESS_TOKEN_KEY,
        getAccessToken,
        saveAccessToken,
        clearAccessToken,
        isAuthenticated,
        login,
        register,
        logout,
        requireAuthenticatedUser
    };

    initializeAuthPage();
})();

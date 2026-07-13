(() => {
    "use strict";

    const API_BASE_URL = window.DeepWorkConfig?.API_BASE_URL;
    const ACCESS_TOKEN_KEY = "deepwork_access_token";

    if (typeof API_BASE_URL !== "string" || !API_BASE_URL) {
        throw new Error("DeepWork API configuration is missing or invalid.");
    }

    function getStoredAccessToken() {
        try {
            return localStorage.getItem(ACCESS_TOKEN_KEY);
        } catch {
            return null;
        }
    }

    async function request(path, options = {}) {
        let response;
        const token = getStoredAccessToken();

        const headers = {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        try {
            response = await fetch(`${API_BASE_URL}${path}`, {
                ...options,
                headers
            });
        } catch (error) {
            const networkError = new Error(`DeepWork API network error: ${error.message}`);
            networkError.isNetworkError = true;
            throw networkError;
        }

        if (!response.ok) {
            let detail = `HTTP ${response.status}`;

            try {
                const errorBody = await response.json();
                detail = errorBody.detail || detail;
            } catch {
                // The server did not return JSON.
            }

            const error = new Error(detail);
            error.status = response.status;

            if (response.status === 401) {
                window.dispatchEvent(new CustomEvent("deepwork:unauthorized"));
            }

            throw error;
        }

        if (response.status === 204) {
            return null;
        }

        try {
            return await response.json();
        } catch {
            throw new Error("DeepWork API returned invalid JSON.");
        }
    }

    function register(email, password) {
        return request("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    }

    function login(email, password) {
        return request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    }

    function getCurrentUser() {
        return request("/api/auth/me");
    }

    function updateDailyFocusGoal(minutes) {
        return request("/api/auth/me/goal", {
            method: "PATCH",
            body: JSON.stringify({ dailyFocusGoalMinutes: minutes })
        });
    }

    function getSessions() {
        return request("/api/sessions");
    }

    function getSessionsByDate(date) {
        return request(`/api/sessions/date/${encodeURIComponent(date)}`);
    }

    function createSession(session) {
        return request("/api/sessions", {
            method: "POST",
            body: JSON.stringify(session)
        });
    }

    function deleteSession(sessionId) {
        return request(`/api/sessions/${encodeURIComponent(sessionId)}`, {
            method: "DELETE"
        });
    }

    window.DeepWorkAPI = {
        API_BASE_URL,
        register,
        login,
        getCurrentUser,
        updateDailyFocusGoal,
        getSessions,
        getSessionsByDate,
        createSession,
        deleteSession
    };
})();

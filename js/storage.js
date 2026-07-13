(() => {
    "use strict";

    const ACTIVE_SESSION_KEY = "deepwork_active_session";
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    function isValidIsoTimestamp(value) {
        return typeof value === "string" && Number.isFinite(Date.parse(value));
    }

    function isValidActiveSession(session) {
        return Boolean(
            session &&
            typeof session === "object" &&
            typeof session.id === "string" &&
            session.id.length > 0 &&
            typeof session.date === "string" &&
            DATE_PATTERN.test(session.date) &&
            isValidIsoTimestamp(session.startTime)
        );
    }

    function getActiveSession() {
        try {
            const rawSession = localStorage.getItem(ACTIVE_SESSION_KEY);
            if (!rawSession) return null;

            const session = JSON.parse(rawSession);
            if (!isValidActiveSession(session)) {
                localStorage.removeItem(ACTIVE_SESSION_KEY);
                return null;
            }

            return session;
        } catch (error) {
            console.warn("DeepWork could not restore the active session.", error);
            return null;
        }
    }

    function saveActiveSession(session) {
        if (!isValidActiveSession(session)) {
            console.warn("DeepWork rejected an invalid active session.");
            return false;
        }

        try {
            localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
            return true;
        } catch (error) {
            console.error("DeepWork could not persist the active session.", error);
            return false;
        }
    }

    function clearActiveSession() {
        try {
            localStorage.removeItem(ACTIVE_SESSION_KEY);
            return true;
        } catch (error) {
            console.error("DeepWork could not clear the active session.", error);
            return false;
        }
    }

    window.DeepWorkStorage = {
        ACTIVE_SESSION_KEY,
        getActiveSession,
        saveActiveSession,
        clearActiveSession
    };
})();

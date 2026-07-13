(() => {
    "use strict";

    const timerDisplay = document.getElementById("main-timer");
    const toggleButton = document.getElementById("start-btn");
    const resetButton = document.getElementById("reset-btn");
    const sessionStatus = document.getElementById("session-status");
    const sessionStartTime = document.getElementById("session-start-time");
    const dailyGoalDisplay = document.getElementById("timer-daily-goal");
    const storage = window.DeepWorkStorage;
    const api = window.DeepWorkAPI;
    const auth = window.DeepWorkAuth;

    if (!timerDisplay || !toggleButton || !resetButton || !sessionStatus || !sessionStartTime || !storage || !api || !auth) {
        console.error("DeepWork timer UI could not be initialized.");
        return;
    }

    let isRunning = false;
    let isStopping = false;
    let activeSession = null;
    let sessionStart = null;
    let timerInterval = null;

    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function createSessionId() {
        return typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function formatElapsed(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    function formatStartTime(date) {
        return date.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    function formatGoal(minutes) {
        const value = Math.round(Number(minutes) || 0);
        const hours = Math.floor(value / 60);
        const remaining = value % 60;
        if (hours && remaining) return `${hours}h ${remaining}m`;
        if (hours) return `${hours}h`;
        return `${remaining}m`;
    }

    function formatLocalDate(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function updateTimerDisplay() {
        if (!isRunning || !sessionStart) {
            return;
        }

        timerDisplay.textContent = formatElapsed(Date.now() - sessionStart.getTime());
    }

    function setButtonState(running) {
        const buttonContent = toggleButton.querySelector(".flex.items-center.gap-3");

        if (!buttonContent) {
            return;
        }

        const icon = running ? "stop" : "play_arrow";
        const label = running ? "Stop Focus" : "Start Focus";

        toggleButton.classList.toggle("timer-action--start", !running);
        toggleButton.classList.toggle("timer-action--stop", running);
        toggleButton.setAttribute("aria-pressed", String(running));
        toggleButton.setAttribute("aria-label", label);
        buttonContent.innerHTML = `
            <span class="material-symbols-outlined fill-current" style="font-variation-settings: 'FILL' 1;">${icon}</span>
            ${label}
        `;
    }

    function renderRunningState() {
        sessionStatus.textContent = "Current Deep Work Session";
        sessionStartTime.textContent = `Started at ${formatStartTime(sessionStart)}`;
        setButtonState(true);
        updateTimerDisplay();
    }

    function startDisplayInterval() {
        if (timerInterval !== null) {
            return;
        }

        timerInterval = window.setInterval(updateTimerDisplay, 1000);
    }

    function restoreActiveSession() {
        const storedSession = storage.getActiveSession();

        if (!storedSession) {
            return false;
        }

        const restoredStart = new Date(storedSession.startTime);

        if (!Number.isFinite(restoredStart.getTime())) {
            return false;
        }

        activeSession = storedSession;
        sessionStart = restoredStart;
        isRunning = true;

        renderRunningState();
        startDisplayInterval();
        return true;
    }

    function startFocus() {
        if (isRunning || isStopping || timerInterval !== null) {
            return;
        }

        if (restoreActiveSession()) {
            return;
        }

        const start = new Date();
        const newActiveSession = {
            id: createSessionId(),
            date: formatLocalDate(start),
            startTime: start.toISOString()
        };

        if (!storage.saveActiveSession(newActiveSession)) {
            console.error("DeepWork could not start because the active session was not persisted.");
            return;
        }

        activeSession = newActiveSession;
        sessionStart = start;
        isRunning = true;

        renderRunningState();
        startDisplayInterval();
        window.dispatchEvent(new CustomEvent("deepwork:active-session-changed"));
    }

    function resetTimerUi() {
        activeSession = null;
        sessionStart = null;
        timerDisplay.textContent = "00:00:00";
        sessionStatus.textContent = "No Active Focus Session";
        sessionStartTime.textContent = "Ready to focus";
        setButtonState(false);
    }

    function clearDisplayInterval() {
        if (timerInterval !== null) {
            window.clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetFocus() {
        if (isStopping) {
            return;
        }

        const storedActiveSession = storage.getActiveSession();

        if (!isRunning && !storedActiveSession) {
            clearDisplayInterval();
            resetTimerUi();
            return;
        }

        if (!window.confirm("Reset this focus session? Current focus time will not be saved.")) {
            return;
        }

        clearDisplayInterval();
        isRunning = false;
        storage.clearActiveSession();
        resetTimerUi();
        window.dispatchEvent(new CustomEvent("deepwork:active-session-changed"));
    }

    async function stopFocus() {
        if (!isRunning || isStopping) {
            return;
        }

        isStopping = true;
        toggleButton.disabled = true;
        resetButton.disabled = true;

        try {
            const storedActiveSession = storage.getActiveSession();

            if (!storedActiveSession) {
                console.warn("DeepWork could not find the active session to stop.");
                isRunning = false;

                clearDisplayInterval();

                resetTimerUi();
                return;
            }

            const originalStart = new Date(storedActiveSession.startTime);
            const sessionEnd = new Date();

            clearDisplayInterval();

            isRunning = false;

            const durationSeconds = Math.max(
                0,
                Math.floor((sessionEnd.getTime() - originalStart.getTime()) / 1000)
            );

            const completedSession = {
                id: storedActiveSession.id,
                date: storedActiveSession.date,
                startTime: storedActiveSession.startTime,
                endTime: sessionEnd.toISOString(),
                durationSeconds,
                durationMinutes: Number((durationSeconds / 60).toFixed(2))
            };

            try {
                await api.createSession(completedSession);
            } catch (error) {
                console.error(
                    "DeepWork could not save the completed session to the API. The active session was retained so Stop Focus can be retried.",
                    error
                );

                isRunning = true;
                renderRunningState();
                startDisplayInterval();
                return;
            }

            storage.clearActiveSession();
            console.log("DeepWork completed session:", completedSession);
            resetTimerUi();
            window.dispatchEvent(new CustomEvent("deepwork:active-session-changed"));
        } finally {
            isStopping = false;
            toggleButton.disabled = false;
            resetButton.disabled = false;
        }
    }

    function toggleFocus() {
        if (isRunning) {
            stopFocus();
        } else {
            startFocus();
        }
    }

    toggleButton.addEventListener("click", toggleFocus);
    resetButton.addEventListener("click", resetFocus);

    document.addEventListener("keydown", (event) => {
        const activeTag = document.activeElement?.tagName;

        if (
            event.code === "Space" &&
            activeTag !== "INPUT" &&
            activeTag !== "TEXTAREA" &&
            activeTag !== "BUTTON"
        ) {
            event.preventDefault();
            toggleFocus();
        }
    });

    auth.requireAuthenticatedUser().then((user) => {
        if (!user) return;
        if (dailyGoalDisplay) {
            dailyGoalDisplay.textContent = `Daily Goal · ${formatGoal(user.dailyFocusGoalMinutes)}`;
        }
        restoreActiveSession();
    }).catch(() => {
        if (dailyGoalDisplay) {
            dailyGoalDisplay.textContent = "Daily Goal · Unavailable";
        }
    });
})();

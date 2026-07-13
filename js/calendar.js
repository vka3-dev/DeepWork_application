(() => {
    "use strict";

    const api = window.DeepWorkAPI;
    const auth = window.DeepWorkAuth;

    const grid = document.querySelector(".calendar-grid");
    const monthTitle = document.getElementById("calendar-month-title");
    const monthlySessionCount = document.getElementById("monthly-session-count");
    const previousMonthButton = document.getElementById("previous-month");
    const nextMonthButton = document.getElementById("next-month");
    const todayButton = document.getElementById("today-button");
    const calendarError = document.getElementById("calendar-error");

    const goalDisplay = document.getElementById("daily-goal-display");
    const goalEditButton = document.getElementById("daily-goal-edit");
    const goalForm = document.getElementById("daily-goal-form");
    const goalInput = document.getElementById("daily-goal-input");
    const goalCancelButton = document.getElementById("daily-goal-cancel");

    const summaryDate = document.getElementById("summary-date");
    const summaryStatus = document.getElementById("summary-status");
    const summaryTime = document.getElementById("summary-time");
    const summaryPercentage = document.getElementById("summary-percentage");
    const summarySessionCount = document.getElementById("summary-session-count");
    const summarySessionList = document.getElementById("summary-session-list");

    if (!api || !auth || !grid || !monthTitle || !goalForm) {
        console.error("DeepWork calendar could not be initialized.");
        return;
    }

    let completedSessions = [];
    let dailyFocusGoalMinutes = null;
    let visibleMonth = new Date();
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    let selectedDate = formatLocalDate(new Date());
    let goalSaving = false;

    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function formatLocalDate(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function parseLocalDate(dateString) {
        const [year, month, day] = dateString.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    function formatDuration(minutes) {
        const rounded = Math.round(Number(minutes) || 0);
        const hours = Math.floor(rounded / 60);
        const remaining = rounded % 60;
        if (hours && remaining) return `${hours}h ${remaining}m`;
        if (hours) return `${hours}h`;
        return `${remaining}m`;
    }

    function showError(message) {
        calendarError.textContent = message;
        calendarError.classList.remove("hidden");
    }

    function clearError() {
        calendarError.textContent = "";
        calendarError.classList.add("hidden");
    }

    function getSessionsByDate(date) {
        return completedSessions.filter((session) => session.date === date);
    }

    function getDailyStats(date) {
        const sessions = getSessionsByDate(date);
        const totalMinutes = sessions.reduce(
            (total, session) => total + Number(session.durationMinutes || 0),
            0
        );
        const goal = dailyFocusGoalMinutes || 120;
        const rawPercentage = (totalMinutes / goal) * 100;

        return {
            sessions,
            totalMinutes,
            rawPercentage,
            visualPercentage: Math.min(100, Math.max(0, rawPercentage))
        };
    }

    function formatClockTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    function clearDayCells() {
        grid.querySelectorAll(".calendar-day-cell")
            .forEach((cell) => cell.remove());
    }

    function createDayCell(date, isCurrentMonth) {
        const dateString = formatLocalDate(date);
        const stats = getDailyStats(dateString);
        const isSelected = dateString === selectedDate;
        const isToday = dateString === formatLocalDate(new Date());
        const actualPercentage = Math.max(0, stats.rawPercentage);
        const percentage = Math.round(actualPercentage);
        const visualFillPercentage = Math.min((actualPercentage / 200) * 100, 100);

        const cell = document.createElement("div");
        cell.dataset.date = dateString;
        cell.className = `calendar-day-cell calendar-cell relative min-h-28 sm:min-h-32 p-2 sm:p-stack-sm border-r border-b border-[#3F3F46] transition-colors cursor-pointer group ${isCurrentMonth ? "bg-[#09090B] hover:bg-[#18181B]" : "bg-[#18181B] hover:opacity-75 calendar-day-cell--outside"} ${isSelected ? "calendar-day-cell--selected" : ""} ${percentage === 0 ? "calendar-day-cell--empty" : ""}`;
        cell.dataset.waterLevel = `${visualFillPercentage}%`;
        cell.style.setProperty("--water-level", "0%");
        cell.innerHTML = `
            <div class="calendar-water" aria-hidden="true"></div>
            <div class="calendar-cell-content absolute inset-0 flex flex-col justify-between p-2 sm:p-stack-sm">
                <div class="w-full flex justify-between">
                    <span class="calendar-day-number font-label-md text-label-md text-[#A1A1AA]">${date.getDate()}</span>
                    ${isToday ? '<span class="calendar-today-indicator" aria-label="Today"></span>' : ""}
                </div>
                <span class="calendar-percentage self-center font-label-sm text-[10px]">${percentage}%</span>
            </div>
        `;
        cell.addEventListener("click", () => {
            selectedDate = dateString;
            renderCalendar();
            updateSummary(selectedDate);
        });
        return cell;
    }

    function renderCalendar() {
        clearDayCells();
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const mondayBasedStartDay = (new Date(year, month, 1).getDay() + 6) % 7;

        monthTitle.textContent = visibleMonth.toLocaleDateString([], {
            month: "long",
            year: "numeric"
        });

        const prefix = `${year}-${pad(month + 1)}-`;
        const monthlySessions = completedSessions.filter((session) => session.date.startsWith(prefix));
        monthlySessionCount.textContent = `${monthlySessions.length} total ${monthlySessions.length === 1 ? "session" : "sessions"} this month`;

        for (let index = 0; index < 42; index += 1) {
            const date = new Date(year, month, 1 - mondayBasedStartDay + index);
            grid.appendChild(createDayCell(date, date.getMonth() === month));
        }

        window.requestAnimationFrame(() => {
            grid.querySelectorAll(".calendar-day-cell").forEach((cell) => {
                cell.style.setProperty("--water-level", cell.dataset.waterLevel || "0%");
            });
        });
    }

    function updateSummary(dateString) {
        const stats = getDailyStats(dateString);
        const date = parseLocalDate(dateString);
        const percentage = Math.round(stats.rawPercentage);

        summaryDate.textContent = date.toLocaleDateString([], { month: "long", day: "numeric" });
        summaryStatus.textContent = percentage >= 100
            ? "Goal Complete"
            : percentage >= 50
                ? "In Progress"
                : percentage > 0
                    ? "Getting Started"
                    : "No Focus";
        summaryStatus.classList.toggle("summary-status--muted", percentage === 0);
        summaryTime.textContent = formatDuration(stats.totalMinutes);
        summaryPercentage.textContent = `${percentage}%`;
        summarySessionCount.textContent = `${stats.sessions.length} ${stats.sessions.length === 1 ? "Focus Session" : "Focus Sessions"}`;
        summarySessionList.innerHTML = "";

        if (!stats.sessions.length) {
            const empty = document.createElement("div");
            empty.className = "p-stack-md rounded-lg bg-surface-container-low border border-outline-variant opacity-50";
            empty.innerHTML = '<p class="font-label-md text-label-md text-on-surface-variant">No focus sessions recorded.</p>';
            summarySessionList.appendChild(empty);
            return;
        }

        stats.sessions.forEach((session) => {
            const item = document.createElement("div");
            item.className = "p-stack-md rounded-lg bg-surface-container-high border-l-4 border-primary flex items-center justify-between";
            item.dataset.sessionId = session.id;
            item.innerHTML = `
                <div>
                    <p class="font-label-md text-label-md text-on-surface">Deep Focus</p>
                    <p class="font-label-sm text-label-sm text-on-surface-variant">${formatClockTime(session.startTime)} - ${formatClockTime(session.endTime)} · ${formatDuration(session.durationMinutes)}</p>
                </div>
                <div class="flex items-center gap-stack-sm">
                    <span class="material-symbols-outlined text-primary">check_circle</span>
                    <button type="button" class="session-delete-control w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant opacity-60 hover:opacity-100 hover:bg-surface-container-highest focus:outline-none focus:ring-1 focus:ring-primary transition-all active:scale-90" data-session-id="${session.id}" aria-label="Delete focus session" title="Delete focus session">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            `;
            summarySessionList.appendChild(item);
        });
    }

    function renderGoal() {
        goalDisplay.textContent = dailyFocusGoalMinutes ? formatDuration(dailyFocusGoalMinutes) : "—";
    }

    function setGoalEditing(editing) {
        goalDisplay.parentElement.classList.toggle("hidden", editing);
        goalEditButton.classList.toggle("hidden", editing);
        goalForm.classList.toggle("hidden", !editing);
        goalForm.classList.toggle("flex", editing);
        if (editing) {
            goalInput.value = dailyFocusGoalMinutes;
            goalInput.focus();
            goalInput.select();
        }
    }

    async function handleGoalSubmit(event) {
        event.preventDefault();
        if (goalSaving) return;

        const minutes = Number(goalInput.value);
        if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) {
            showError("Daily goal must be between 15 and 1440 minutes.");
            return;
        }

        goalSaving = true;
        const submitButton = goalForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        clearError();

        try {
            const user = await api.updateDailyFocusGoal(minutes);
            dailyFocusGoalMinutes = user.dailyFocusGoalMinutes;
            renderGoal();
            renderCalendar();
            updateSummary(selectedDate);
            setGoalEditing(false);
        } catch (error) {
            if (error.status !== 401) showError("Unable to update daily goal.");
        } finally {
            goalSaving = false;
            submitButton.disabled = false;
        }
    }

    async function refreshSessions() {
        completedSessions = await api.getSessions();
        renderCalendar();
        updateSummary(selectedDate);
    }

    async function handleSessionDelete(event) {
        const button = event.target.closest(".session-delete-control");
        if (!button) return;
        const sessionId = button.dataset.sessionId;
        if (!sessionId || !window.confirm("Delete this focus session?")) return;

        button.disabled = true;
        try {
            await api.deleteSession(sessionId);
            await refreshSessions();
        } catch (error) {
            if (error.status !== 401) showError("Unable to delete focus session.");
            button.disabled = false;
        }
    }

    function showMonth(date) {
        visibleMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        renderCalendar();
    }

    previousMonthButton.addEventListener("click", () => {
        showMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1));
    });
    nextMonthButton.addEventListener("click", () => {
        showMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1));
    });
    todayButton.addEventListener("click", () => {
        const today = new Date();
        selectedDate = formatLocalDate(today);
        visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        renderCalendar();
        updateSummary(selectedDate);
    });
    goalEditButton.addEventListener("click", () => setGoalEditing(true));
    goalCancelButton.addEventListener("click", () => {
        clearError();
        setGoalEditing(false);
    });
    goalForm.addEventListener("submit", handleGoalSubmit);
    summarySessionList.addEventListener("click", handleSessionDelete);

    function renderUnavailableState(message) {
        completedSessions = [];
        dailyFocusGoalMinutes = dailyFocusGoalMinutes || 120;
        renderGoal();
        renderCalendar();
        updateSummary(selectedDate);
        monthlySessionCount.textContent = "Focus sessions unavailable";
        showError(message);
    }

    async function initialize() {
        monthlySessionCount.textContent = "Loading focus sessions...";
        summarySessionList.innerHTML = '<div class="p-stack-md rounded-lg bg-surface-container-low border border-outline-variant opacity-50"><p class="font-label-md text-label-md text-on-surface-variant">Loading focus data...</p></div>';

        let user;
        try {
            user = await auth.requireAuthenticatedUser();
        } catch (error) {
            console.error("DeepWork could not initialize the calendar authentication.", error);
            renderUnavailableState("Unable to verify your DeepWork account. Check the API connection and try again.");
            return;
        }

        if (!user) {
            renderUnavailableState("Unable to verify your DeepWork account. Check the API connection and try again.");
            return;
        }

        dailyFocusGoalMinutes = user.dailyFocusGoalMinutes;
        renderGoal();

        try {
            await refreshSessions();
            clearError();
        } catch (error) {
            if (error.status === 401) return;
            completedSessions = [];
            monthlySessionCount.textContent = "Focus sessions unavailable";
            showError("Unable to load focus sessions.");
            renderCalendar();
            updateSummary(selectedDate);
        }
    }

    initialize();
})();

const API_BASE = "http://localhost:18080";
const THEME_KEY = "dayflow_theme";
const TOKEN_KEY = "dayflow_token";

const landingViewEl = document.getElementById("landing-view");
const authGateEl = document.getElementById("auth-gate");
const appShellEl = document.getElementById("app-shell");
const authTabLoginEl = document.getElementById("auth-tab-login");
const authTabRegisterEl = document.getElementById("auth-tab-register");
const authFormEl = document.getElementById("auth-form");
const authNameWrapEl = document.getElementById("auth-name-wrap");
const authNameInput = document.getElementById("auth-name");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authErrorEl = document.getElementById("auth-error");

const bannerEl = document.getElementById("status-banner");
const searchInput = document.getElementById("search-input");

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("task-priority");
const dueInput = document.getElementById("task-due");
const taskListEl = document.getElementById("task-list");
const overviewTaskPreviewEl = document.getElementById("overview-task-preview");

const routineDateInput = document.getElementById("routine-date-input");
const routineForm = document.getElementById("routine-form");
const routineTitleInput = document.getElementById("routine-title");
const routineStartInput = document.getElementById("routine-start");
const routineEndInput = document.getElementById("routine-end");
const routineCategoryInput = document.getElementById("routine-category");
const routineImportantInput = document.getElementById("routine-important");
const gcalWeekHeaderEl = document.getElementById("gcal-week-header");
const gcalTimeGridEl = document.getElementById("gcal-time-grid");
const calendarImportantListEl = document.getElementById("calendar-important-list");

const noteForm = document.getElementById("note-form");
const noteDateInput = document.getElementById("note-date-input");
const noteTitleInput = document.getElementById("note-title-input");
const noteContentInput = document.getElementById("note-content-input");
const notesHistoryListEl = document.getElementById("notes-history-list");

const habitForm = document.getElementById("habit-form");
const habitInput = document.getElementById("habit-input");
const habitListEl = document.getElementById("habit-list");

function getLocalToday() {
  return formatYMD(new Date());
}

function formatYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function getSundayOfWeek(ymd) {
  const dt = parseYMD(ymd);
  dt.setDate(dt.getDate() - dt.getDay());
  return dt;
}

const initToday = getLocalToday();
const initDateObj = parseYMD(initToday);

let state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  authMode: "login",
  tasks: [],
  habits: [],
  notes: [],
  routines: [],
  summary: null,
  filter: "all",
  search: "",
  activeView: "overview",
  routineDate: initToday,
  weekStartDate: formatYMD(getSundayOfWeek(initToday)),
  miniCalYear: initDateObj.getFullYear(),
  miniCalMonth: initDateObj.getMonth(),
  enabledCategories: new Set(["focus", "routine", "meeting", "important"]),
  selectedNoteDate: initToday,
  focusedTaskTitle: "Deep Focus Session",
};

function replaySmoothAnim(el) {
  if (!el) return;
  el.classList.remove("page-enter");
  void el.offsetWidth;
  el.classList.add("page-enter");
}

function playDayflowTypewriter(onDone, word = "DAYFLOW") {
  const overlay = document.getElementById("entry-typewriter-overlay");
  const target = document.getElementById("typewriter-target");
  const sub = overlay?.querySelector(".typewriter-sub");

  if (!overlay || !target) {
    if (typeof onDone === "function") onDone();
    return;
  }

  overlay.classList.remove("hidden", "fade-out");
  target.textContent = "";
  if (sub) sub.classList.remove("visible");

  let index = 0;
  const stepMs = 115;

  const timer = setInterval(() => {
    index += 1;
    target.textContent = word.slice(0, index);

    if (index === 3 && sub) {
      sub.classList.add("visible");
    }

    if (index >= word.length) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.classList.add("fade-out");
        setTimeout(() => {
          overlay.classList.add("hidden");
          if (typeof onDone === "function") onDone();
        }, 440);
      }, 320);
    }
  }, stepMs);
}

function authHeaders(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (state.token) h["Authorization"] = `Bearer ${state.token}`;
  return h;
}

function showLanding() {
  appShellEl.classList.add("hidden");
  authGateEl.classList.add("hidden");
  landingViewEl.classList.remove("hidden");
  replaySmoothAnim(landingViewEl);
}

function openAuthScreen(mode = "login", msg = "") {
  landingViewEl.classList.add("hidden");
  appShellEl.classList.add("hidden");
  setAuthMode(mode);
  authGateEl.classList.remove("hidden");
  replaySmoothAnim(authGateEl);

  if (msg) {
    authErrorEl.textContent = msg;
    authErrorEl.classList.remove("hidden");
  } else {
    authErrorEl.classList.add("hidden");
  }
}

function showAuthGate(msg = "") {
  openAuthScreen(state.authMode || "login", msg);
}

function hideAuthGate() {
  landingViewEl.classList.add("hidden");
  authGateEl.classList.add("hidden");
  appShellEl.classList.remove("hidden");
  replaySmoothAnim(appShellEl);
  authErrorEl.classList.add("hidden");
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isReg = mode === "register";
  authTabLoginEl.classList.toggle("active", !isReg);
  authTabRegisterEl.classList.toggle("active", isReg);
  authNameWrapEl.classList.toggle("hidden", !isReg);
  authSubmitBtn.textContent = isReg ? "Create Account" : "Sign In";
  authErrorEl.classList.add("hidden");
}

document.getElementById("open-login-btn")?.addEventListener("click", () => openAuthScreen("login"));
document.getElementById("open-register-btn")?.addEventListener("click", () => openAuthScreen("register"));
document.getElementById("hero-login-btn")?.addEventListener("click", () => openAuthScreen("login"));
document.getElementById("hero-register-btn")?.addEventListener("click", () => openAuthScreen("register"));
document.getElementById("back-to-landing-btn")?.addEventListener("click", showLanding);
document.getElementById("landing-theme-btn")?.addEventListener("click", toggleTheme);

authTabLoginEl.addEventListener("click", () => setAuthMode("login"));
authTabRegisterEl.addEventListener("click", () => setAuthMode("register"));

authFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const name = authNameInput.value.trim();
  const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAuthGate(data.error || "Authentication failed");
      return;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    authPasswordInput.value = "";
    playDayflowTypewriter(() => {
      hideAuthGate();
      loadDashboard();
    });
  } catch {
    showAuthGate("Cannot reach backend server.");
  }
});

async function handleProviderAuth(provider) {
  let email = "";
  let name = "";

  if (provider === "google") {
    const entered = window.prompt("Enter your Gmail address to sign in:", "user@gmail.com");
    if (entered === null) return;
    email = entered.trim();
    name = email.split("@")[0] || "Gmail User";
  } else if (provider === "github") {
    const entered = window.prompt("Enter your GitHub email or username:", "dev@github.local");
    if (entered === null) return;
    email = entered.trim();
    name = email.split("@")[0] || "GitHub User";
  } else {
    name = "Guest User";
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, name, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAuthGate(data.error || "Sign-in failed");
      return;
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    playDayflowTypewriter(() => {
      hideAuthGate();
      loadDashboard();
    });
  } catch {
    showAuthGate("Cannot reach backend server.");
  }
}

document.getElementById("btn-google-auth").addEventListener("click", () => handleProviderAuth("google"));
document.getElementById("btn-github-auth").addEventListener("click", () => handleProviderAuth("github"));
document.getElementById("btn-guest-auth").addEventListener("click", () => handleProviderAuth("guest"));

document.getElementById("logout-btn").addEventListener("click", async () => {
  try {
    if (state.token) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
  } finally {
    state.token = "";
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    showLanding();
  }
});

function updateHeaderDate() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Welcome back";
  const displayName = state.user?.name || "there";
  document.getElementById("greeting-title").textContent = `${greet}, ${displayName}`;
  document.getElementById("user-badge").textContent = state.user?.email || "Signed in";
  document.getElementById("today-pill").textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-theme", isDark);
  const label = isDark ? "Light Mode" : "Dark Mode";
  document.getElementById("theme-toggle").textContent = label;
  document.getElementById("theme-toggle-side").textContent = isDark ? "Light" : "Dark";
  const landingThemeBtn = document.getElementById("landing-theme-btn");
  if (landingThemeBtn) landingThemeBtn.textContent = label;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const next = document.body.classList.contains("dark-theme") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
document.getElementById("theme-toggle-side").addEventListener("click", toggleTheme);

function setActiveView(view) {
  state.activeView = view;
  document.querySelectorAll(".nav-btn, .m-nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  const map = {
    overview: "tab-overview",
    tasks: "tab-tasks",
    calendar: "tab-calendar",
    notes: "tab-notes",
    focus: "tab-focus",
    habits: "tab-habits",
  };

  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isTarget = key === view;
    el.classList.toggle("hidden", !isTarget);
    if (isTarget) {
      replaySmoothAnim(el);
    }
  });

  const subtitles = {
    overview: "Overview · Read-only summary of your day",
    tasks: "Tasks · Add, filter, complete, or remove tasks",
    calendar: "Calendar · Weekly routine schedule & important tasks",
    notes: "Notes · Notepad editor with previous dates' history",
    focus: "Focus · Pomodoro timer and logged focus minutes",
    habits: "Habits · Daily check-ins and habit management",
  };
  document.getElementById("view-subtitle").textContent = subtitles[view] || "";
}

document.querySelectorAll(".nav-btn, .m-nav-btn, [data-jump]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.view || btn.dataset.jump;
    if (target) setActiveView(target);
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.filter = btn.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderTasks();
  });
});

searchInput.addEventListener("input", (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderOverviewPreview();
  renderTasks();
});

function showError(msg) {
  bannerEl.textContent = msg;
  bannerEl.classList.remove("hidden");
}

function clearError() {
  bannerEl.textContent = "";
  bannerEl.classList.add("hidden");
}

function renderSummary() {
  const s = state.summary;
  if (!s) return;

  document.getElementById("pill-total").textContent = s.total;
  document.getElementById("pill-done").textContent = s.completed;
  document.getElementById("pill-overdue").textContent = s.overdue;

  const nextTask = state.tasks.find((t) => !t.completed);
  document.getElementById("hero-task-title").textContent = nextTask ? nextTask.title : "All planned tasks completed!";
  document.getElementById("hero-prio-badge").textContent = nextTask ? nextTask.priority.toUpperCase() : "CLEAR";
  document.getElementById("hero-focus-total").textContent = `${s.today_focus_minutes}m focused today`;
  document.getElementById("hero-deadline").textContent = nextTask && nextTask.due_at
    ? `Deadline: ${nextTask.due_at}`
    : "Use Tasks, Calendar, Notes or Focus tabs";

  document.getElementById("flow-score-val").textContent = s.flow_score;
  document.getElementById("flow-breakdown").textContent =
    `Tasks ${s.completion_rate}% · Focus ${s.today_focus_minutes}m · Habits ${s.habits_done_today}/${s.habits_total}`;

  const litCount = Math.round((s.flow_score / 100) * 5);
  document.querySelectorAll("#score-segments span").forEach((bar, idx) => {
    bar.classList.toggle("lit", idx < litCount);
  });

  document.getElementById("week-focus-val").textContent = `${s.week_focus_minutes}m`;
  const miniBarsEl = document.getElementById("mini-focus-bars");
  miniBarsEl.innerHTML = "";
  const maxMins = Math.max(30, ...s.weekly.map((d) => d.focus_minutes));

  s.weekly.forEach((day) => {
    const col = document.createElement("div");
    col.className = "mini-bar-col";
    const bar = document.createElement("div");
    bar.className = "mini-bar";
    const pct = Math.max(10, Math.round((day.focus_minutes / maxMins) * 100));
    bar.style.height = `${pct}%`;

    const lbl = document.createElement("span");
    lbl.textContent = day.label.slice(0, 2);
    col.appendChild(bar);
    col.appendChild(lbl);
    miniBarsEl.appendChild(col);
  });

  document.getElementById("insights-list").innerHTML = `
    <div class="insight-item">
      <strong>${s.completed} of ${s.total} tasks completed</strong>
      <span>${s.overdue > 0 ? `${s.overdue} overdue task needs attention` : "Zero overdue tasks right now"}</span>
    </div>
    <div class="insight-item">
      <strong>${s.today_focus_minutes}m deep focus logged today</strong>
      <span>Target: 60m daily focus momentum</span>
    </div>
    <div class="insight-item">
      <strong>Habits: ${s.habits_done_today}/${s.habits_total} checked in</strong>
      <span>Consistent daily check-ins boost Flow Score</span>
    </div>
  `;

  document.getElementById("gauge-ratio").textContent = `${s.completed}/${s.total}`;
  document.getElementById("gauge-percent-text").textContent = `${s.completion_rate}%`;
  document.getElementById("gauge-completed").textContent = s.completed;
  document.getElementById("gauge-pending").textContent = s.pending;
  document.getElementById("gauge-overdue").textContent = s.overdue;

  renderArcGauge(s.completion_rate);
  renderWeeklyChart(s.weekly);
}

function renderArcGauge(percent) {
  const group = document.getElementById("gauge-ticks");
  group.innerHTML = "";
  const totalTicks = 20;
  const activeTicks = Math.round((percent / 100) * totalTicks);
  const cx = 120, cy = 115, rOuter = 88, rInner = 68;

  for (let i = 0; i < totalTicks; i++) {
    const angleDeg = 180 + (i / (totalTicks - 1)) * 180;
    const rad = (angleDeg * Math.PI) / 180;
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toFixed(1));
    line.setAttribute("y1", y1.toFixed(1));
    line.setAttribute("x2", x2.toFixed(1));
    line.setAttribute("y2", y2.toFixed(1));
    line.setAttribute("stroke-width", "7");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke", i < activeTicks ? "#3b82f6" : "rgba(148, 163, 184, 0.25)");
    group.appendChild(line);
  }
}

function renderWeeklyChart(weekly) {
  const svg = document.getElementById("weekly-chart");
  svg.innerHTML = "";
  if (!weekly || !weekly.length) return;

  const w = 560, h = 190, padL = 32, padR = 18, padT = 20, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxVal = Math.max(100, ...weekly.map((d) => d.score));

  [0, 50, 100].forEach((val) => {
    const y = padT + chartH - (val / maxVal) * chartH;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", padL);
    line.setAttribute("x2", w - padR);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "rgba(148,163,184,0.18)");
    svg.appendChild(line);

    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", 4);
    txt.setAttribute("y", y + 4);
    txt.setAttribute("font-size", "10");
    txt.setAttribute("fill", "#94a3b8");
    txt.textContent = val;
    svg.appendChild(txt);
  });

  const points = weekly.map((d, idx) => {
    const x = padL + (idx / Math.max(1, weekly.length - 1)) * chartW;
    const y = padT + chartH - (d.score / maxVal) * chartH;
    return { x, y, label: d.label };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padT + chartH} L ${points[0].x.toFixed(1)} ${padT + chartH} Z`;

  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", areaD);
  area.setAttribute("fill", "rgba(59, 130, 246, 0.16)");
  svg.appendChild(area);

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", pathD);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#3b82f6");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("stroke-linecap", "round");
  svg.appendChild(line);

  points.forEach((p) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", p.x.toFixed(1));
    dot.setAttribute("cy", p.y.toFixed(1));
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", "#14b8a6");
    svg.appendChild(dot);

    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", p.x.toFixed(1));
    lbl.setAttribute("y", h - 8);
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("font-size", "11");
    lbl.setAttribute("fill", "#94a3b8");
    lbl.textContent = p.label;
    svg.appendChild(lbl);
  });
}

function renderOverviewPreview() {
  overviewTaskPreviewEl.innerHTML = "";
  const items = state.tasks.filter((t) =>
    !state.search || t.title.toLowerCase().includes(state.search)
  );

  if (!items.length) {
    overviewTaskPreviewEl.innerHTML = `<li class="muted-small">No tasks to display. Go to Tasks tab to add one.</li>`;
    return;
  }

  items.slice(0, 6).forEach((t) => {
    const li = document.createElement("li");
    li.className = "readonly-row";
    li.innerHTML = `
      <span class="task-title ${t.completed ? "done" : ""}">${t.title}</span>
      <span class="badge priority-${t.priority}">${t.priority.toUpperCase()}</span>
    `;
    overviewTaskPreviewEl.appendChild(li);
  });
}

function renderTasks() {
  taskListEl.innerHTML = "";

  const filtered = state.tasks.filter((t) => {
    if (state.filter === "active" && t.completed) return false;
    if (state.filter === "completed" && !t.completed) return false;
    if (state.filter === "overdue" && !t.overdue) return false;
    if (state.search && !t.title.toLowerCase().includes(state.search)) return false;
    return true;
  });

  if (!filtered.length) {
    taskListEl.innerHTML = `<li class="muted-small">No matching tasks in this view.</li>`;
    return;
  }

  filtered.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.overdue ? "overdue-item" : ""}`;

    const left = document.createElement("div");
    left.className = "task-left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = task.completed;
    cb.addEventListener("change", () => toggleTask(task.id, cb.checked));

    const body = document.createElement("div");
    body.className = "task-body";

    const title = document.createElement("span");
    title.className = `task-title ${task.completed ? "done" : ""}`;
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const badge = document.createElement("span");
    badge.className = `badge priority-${task.priority}`;
    badge.textContent = task.priority.toUpperCase();
    meta.appendChild(badge);

    if (task.due_at) {
      const due = document.createElement("span");
      due.className = `due-tag ${task.overdue ? "overdue" : ""}`;
      due.textContent = task.overdue ? `Overdue · ${task.due_at}` : `Due ${task.due_at}`;
      meta.appendChild(due);
    }

    body.appendChild(title);
    body.appendChild(meta);
    left.appendChild(cb);
    left.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const focusBtn = document.createElement("button");
    focusBtn.type = "button";
    focusBtn.className = "btn-ghost";
    focusBtn.textContent = "Focus";
    focusBtn.addEventListener("click", () => {
      state.focusedTaskTitle = task.title;
      document.getElementById("timer-active-task").textContent = task.title;
      setActiveView("focus");
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-ghost del";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(focusBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(actions);
    taskListEl.appendChild(li);
  });
}

function getWeekDays(weekStartYmd) {
  const start = parseYMD(weekStartYmd);
  const days = [];
  const dowLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      ymd: formatYMD(d),
      dow: dowLabels[d.getDay()],
      dom: d.getDate(),
      monthName: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    });
  }
  return days;
}

function formatHourLabel(hour24) {
  if (hour24 === 12) return "12 PM";
  if (hour24 > 12) return `${hour24 - 12} PM`;
  return `${hour24} AM`;
}

function renderMiniCalendar() {
  const labelEl = document.getElementById("mini-cal-label");
  const daysEl = document.getElementById("mini-cal-days");
  const firstOfMonth = new Date(state.miniCalYear, state.miniCalMonth, 1, 12, 0, 0);
  const lastOfMonth = new Date(state.miniCalYear, state.miniCalMonth + 1, 0, 12, 0, 0);
  const todayStr = getLocalToday();

  labelEl.textContent = firstOfMonth.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  daysEl.innerHTML = "";

  for (let i = 0; i < firstOfMonth.getDay(); i++) {
    daysEl.appendChild(document.createElement("span"));
  }

  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    const dt = new Date(state.miniCalYear, state.miniCalMonth, day, 12, 0, 0);
    const ymd = formatYMD(dt);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-cal-day";
    btn.textContent = String(day);
    if (ymd === todayStr) btn.classList.add("today-ring");
    if (ymd === state.routineDate) btn.classList.add("selected-day");

    btn.addEventListener("click", async () => {
      state.routineDate = ymd;
      routineDateInput.value = ymd;
      const newWeekStart = formatYMD(getSundayOfWeek(ymd));
      const weekChanged = newWeekStart !== state.weekStartDate;
      state.weekStartDate = newWeekStart;
      renderMiniCalendar();
      if (weekChanged) await loadDashboard();
      else renderCalendarGrid();
    });

    daysEl.appendChild(btn);
  }
}

function renderCalendarGrid() {
  const weekDays = getWeekDays(state.weekStartDate);
  const todayStr = getLocalToday();

  const midDay = weekDays[3] || weekDays[0];
  document.getElementById("cal-month-title").textContent = midDay.monthName;

  gcalWeekHeaderEl.innerHTML = `<div class="gcal-corner"></div>`;
  weekDays.forEach((wd) => {
    const col = document.createElement("div");
    col.className = "gcal-day-col-head";
    col.innerHTML = `
      <div class="gcal-dow">${wd.dow}</div>
      <div class="gcal-dom ${wd.ymd === todayStr ? "is-today" : ""}">${wd.dom}</div>
    `;
    col.addEventListener("click", () => {
      state.routineDate = wd.ymd;
      routineDateInput.value = wd.ymd;
      renderMiniCalendar();
    });
    gcalWeekHeaderEl.appendChild(col);
  });

  const visibleBlocks = state.routines.filter((rb) => {
    if (rb.important && state.enabledCategories.has("important")) return true;
    return state.enabledCategories.has(rb.category);
  });

  gcalTimeGridEl.innerHTML = "";
  for (let hr = 8; hr <= 20; hr++) {
    const row = document.createElement("div");
    row.className = "gcal-hour-row";

    const lbl = document.createElement("div");
    lbl.className = "gcal-hour-label";
    lbl.textContent = formatHourLabel(hr);
    row.appendChild(lbl);

    weekDays.forEach((wd) => {
      const slot = document.createElement("div");
      slot.className = "gcal-day-slot";

      const matches = visibleBlocks.filter((rb) => {
        if (rb.block_date !== wd.ymd) return false;
        const parsedHour = parseInt((rb.start_time || "09:00").split(":")[0], 10);
        const clampedHour = Number.isNaN(parsedHour) ? 9 : Math.max(8, Math.min(20, parsedHour));
        return clampedHour === hr;
      });

      matches.forEach((rb) => {
        const chip = document.createElement("div");
        const catClass = rb.important ? "cat-important" : `cat-${rb.category}`;
        chip.className = `gcal-event-chip ${catClass} ${rb.completed ? "done-chip" : ""}`;

        const main = document.createElement("div");
        main.className = "gcal-ev-main";
        main.innerHTML = `
          <div class="gcal-ev-time">${rb.start_time} - ${rb.end_time}</div>
          <div class="gcal-ev-title">${rb.title}</div>
        `;
        main.addEventListener("click", () => toggleRoutine(rb.id));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "gcal-ev-del";
        delBtn.textContent = "×";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteRoutine(rb.id);
        });

        chip.appendChild(main);
        chip.appendChild(delBtn);
        slot.appendChild(chip);
      });

      row.appendChild(slot);
    });

    gcalTimeGridEl.appendChild(row);
  }

  calendarImportantListEl.innerHTML = "";
  const impBlocks = state.routines.filter((r) => !r.completed && r.important);
  const impTasks = state.tasks.filter(
    (t) => !t.completed && (t.priority === "high" || t.priority === "urgent" || t.overdue)
  );

  if (!impBlocks.length && !impTasks.length) {
    calendarImportantListEl.innerHTML = `<li class="muted-small">No important items flagged.</li>`;
    return;
  }

  impBlocks.forEach((b) => {
    const li = document.createElement("li");
    li.className = "gcal-reminder-item";
    li.innerHTML = `<strong>${b.title}</strong><div class="muted-small">${b.block_date} · ${b.start_time}</div>`;
    calendarImportantListEl.appendChild(li);
  });

  impTasks.slice(0, 4).forEach((t) => {
    const li = document.createElement("li");
    li.className = "gcal-reminder-item";
    li.innerHTML = `<strong>${t.title}</strong><div class="muted-small">${t.due_at ? `Due ${t.due_at}` : t.priority.toUpperCase()}</div>`;
    calendarImportantListEl.appendChild(li);
  });
}

function renderNotesHistory() {
  notesHistoryListEl.innerHTML = "";
  if (!state.notes.length) {
    notesHistoryListEl.innerHTML = `<li class="muted-small">No saved notes yet. Write and click Save Note.</li>`;
    return;
  }

  state.notes.forEach((n) => {
    const li = document.createElement("li");
    li.className = `note-history-item ${n.note_date === state.selectedNoteDate ? "active" : ""}`;

    const meta = document.createElement("div");
    meta.className = "note-hist-meta";
    meta.innerHTML = `
      <span class="note-hist-date">${n.note_date}</span>
      <span class="note-hist-title">${n.title}</span>
    `;
    meta.addEventListener("click", () => {
      state.selectedNoteDate = n.note_date;
      noteDateInput.value = n.note_date;
      noteTitleInput.value = n.title;
      noteContentInput.value = n.content;
      renderNotesHistory();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-ghost del";
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(n.id);
    });

    li.appendChild(meta);
    li.appendChild(del);
    notesHistoryListEl.appendChild(li);
  });
}

function renderHabits() {
  habitListEl.innerHTML = "";
  const s = state.summary;
  if (s) {
    document.getElementById("habits-count-chip").textContent = `${s.habits_done_today}/${s.habits_total}`;
  }

  if (!state.habits.length) {
    habitListEl.innerHTML = `<li class="muted-small">No habits yet. Add one above.</li>`;
    return;
  }

  state.habits.forEach((h) => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const left = document.createElement("div");
    left.className = "habit-left";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = h.completed_today;
    cb.addEventListener("change", () => toggleHabit(h.id));

    const span = document.createElement("span");
    span.className = h.completed_today ? "done" : "";
    span.textContent = h.title;

    left.appendChild(cb);
    left.appendChild(span);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "6px";

    const streak = document.createElement("span");
    streak.className = "tag-chip";
    streak.textContent = `${h.week_count}/7d`;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn-ghost del";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteHabit(h.id));

    right.appendChild(streak);
    right.appendChild(del);

    li.appendChild(left);
    li.appendChild(right);
    habitListEl.appendChild(li);
  });
}

async function loadDashboard() {
  if (!state.token) {
    showLanding();
    return;
  }

  try {
    const today = getLocalToday();
    const weekDays = getWeekDays(state.weekStartDate);
    const weekStart = weekDays[0].ymd;
    const weekEnd = weekDays[6].ymd;

    const url = `${API_BASE}/api/dashboard?date=${today}&routine_date=${state.routineDate}&week_start=${weekStart}&week_end=${weekEnd}`;
    const res = await fetch(url, { headers: authHeaders() });

    if (res.status === 401) {
      state.token = "";
      localStorage.removeItem(TOKEN_KEY);
      showAuthGate("Session expired. Please sign in again.");
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    clearError();
    hideAuthGate();

    state.user = data.user || state.user;
    state.tasks = data.tasks || [];
    state.habits = data.habits || [];
    state.notes = data.notes || [];
    state.routines = data.routines || [];
    state.summary = data.summary || null;

    const firstOpen = state.tasks.find((t) => !t.completed);
    if (firstOpen && state.focusedTaskTitle === "Deep Focus Session") {
      state.focusedTaskTitle = firstOpen.title;
      document.getElementById("timer-active-task").textContent = firstOpen.title;
    }

    if (!noteContentInput.dataset.dirty) {
      const matchedNote = state.notes.find((n) => n.note_date === state.selectedNoteDate);
      if (matchedNote) {
        noteDateInput.value = matchedNote.note_date;
        noteTitleInput.value = matchedNote.title;
        noteContentInput.value = matchedNote.content;
      } else {
        noteDateInput.value = state.selectedNoteDate;
        noteTitleInput.value = "";
        noteContentInput.value = "";
      }
    }

    updateHeaderDate();
    renderSummary();
    renderOverviewPreview();
    renderTasks();
    renderMiniCalendar();
    renderCalendarGrid();
    renderNotesHistory();
    renderHabits();
  } catch {
    showError(`Backend connection failed (${API_BASE}). Make sure dayflow.exe is running.`);
  }
}

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title, priority: priorityInput.value, due_at: dueInput.value || "" }),
    });
    if (!res.ok) throw new Error("Failed");
    taskInput.value = "";
    priorityInput.value = "medium";
    dueInput.value = "";
    await loadDashboard();
  } catch {
    showError("Could not add task.");
  }
});

async function toggleTask(id, completed) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ completed, today: getLocalToday() }),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not update task.");
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not delete task.");
  }
}

document.getElementById("cal-today-btn").addEventListener("click", async () => {
  const t = getLocalToday();
  const dt = parseYMD(t);
  state.routineDate = t;
  state.weekStartDate = formatYMD(getSundayOfWeek(t));
  state.miniCalYear = dt.getFullYear();
  state.miniCalMonth = dt.getMonth();
  routineDateInput.value = t;
  await loadDashboard();
});

document.getElementById("cal-prev-week").addEventListener("click", async () => {
  const dt = parseYMD(state.weekStartDate);
  dt.setDate(dt.getDate() - 7);
  state.weekStartDate = formatYMD(dt);
  state.routineDate = state.weekStartDate;
  routineDateInput.value = state.routineDate;
  state.miniCalYear = dt.getFullYear();
  state.miniCalMonth = dt.getMonth();
  await loadDashboard();
});

document.getElementById("cal-next-week").addEventListener("click", async () => {
  const dt = parseYMD(state.weekStartDate);
  dt.setDate(dt.getDate() + 7);
  state.weekStartDate = formatYMD(dt);
  state.routineDate = state.weekStartDate;
  routineDateInput.value = state.routineDate;
  state.miniCalYear = dt.getFullYear();
  state.miniCalMonth = dt.getMonth();
  await loadDashboard();
});

document.getElementById("mini-prev-month").addEventListener("click", () => {
  if (state.miniCalMonth === 0) {
    state.miniCalMonth = 11;
    state.miniCalYear--;
  } else {
    state.miniCalMonth--;
  }
  renderMiniCalendar();
});

document.getElementById("mini-next-month").addEventListener("click", () => {
  if (state.miniCalMonth === 11) {
    state.miniCalMonth = 0;
    state.miniCalYear++;
  } else {
    state.miniCalMonth++;
  }
  renderMiniCalendar();
});

document.querySelectorAll(".cal-cat-filter").forEach((cb) => {
  cb.addEventListener("change", () => {
    if (cb.checked) state.enabledCategories.add(cb.value);
    else state.enabledCategories.delete(cb.value);
    renderCalendarGrid();
  });
});

routineForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = routineTitleInput.value.trim();
  if (!title) return;

  const chosenDate = routineDateInput.value || state.routineDate;
  state.routineDate = chosenDate;
  state.weekStartDate = formatYMD(getSundayOfWeek(chosenDate));

  try {
    const res = await fetch(`${API_BASE}/api/routines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        block_date: chosenDate,
        start_time: routineStartInput.value || "09:00",
        end_time: routineEndInput.value || "10:00",
        title,
        category: routineCategoryInput.value || "routine",
        important: routineImportantInput.checked,
      }),
    });
    if (!res.ok) throw new Error("Failed");
    routineTitleInput.value = "";
    routineImportantInput.checked = false;
    await loadDashboard();
  } catch {
    showError("Could not save routine block.");
  }
});

async function toggleRoutine(id) {
  try {
    const res = await fetch(`${API_BASE}/api/routines/${id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not update routine block.");
  }
}

async function deleteRoutine(id) {
  try {
    const res = await fetch(`${API_BASE}/api/routines/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not delete routine block.");
  }
}

noteContentInput.addEventListener("input", () => {
  noteContentInput.dataset.dirty = "1";
});

noteDateInput.addEventListener("change", () => {
  state.selectedNoteDate = noteDateInput.value || getLocalToday();
  delete noteContentInput.dataset.dirty;
  const matched = state.notes.find((n) => n.note_date === state.selectedNoteDate);
  noteTitleInput.value = matched ? matched.title : "";
  noteContentInput.value = matched ? matched.content : "";
  renderNotesHistory();
});

document.getElementById("new-today-note-btn").addEventListener("click", () => {
  const today = getLocalToday();
  state.selectedNoteDate = today;
  noteDateInput.value = today;
  delete noteContentInput.dataset.dirty;
  const matched = state.notes.find((n) => n.note_date === today);
  noteTitleInput.value = matched ? matched.title : "";
  noteContentInput.value = matched ? matched.content : "";
  renderNotesHistory();
});

noteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nDate = noteDateInput.value || getLocalToday();
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value;

  try {
    const res = await fetch(`${API_BASE}/api/notes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ note_date: nDate, title, content }),
    });
    if (!res.ok) throw new Error("Failed");
    state.selectedNoteDate = nDate;
    delete noteContentInput.dataset.dirty;
    await loadDashboard();
  } catch {
    showError("Could not save note.");
  }
});

async function deleteNote(id) {
  try {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not delete note.");
  }
}

habitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = habitInput.value.trim();
  if (!title) return;
  try {
    const res = await fetch(`${API_BASE}/api/habits`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed");
    habitInput.value = "";
    await loadDashboard();
  } catch {
    showError("Could not add habit.");
  }
});

async function toggleHabit(id) {
  try {
    const res = await fetch(`${API_BASE}/api/habits/${id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ today: getLocalToday() }),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not update habit.");
  }
}

async function deleteHabit(id) {
  try {
    const res = await fetch(`${API_BASE}/api/habits/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
    await loadDashboard();
  } catch {
    showError("Could not delete habit.");
  }
}

const RING_CIRCUMFERENCE = 527.78;
let presetMinutes = 25;
let remainingSeconds = 25 * 60;
let timerInterval = null;

function updateTimerUI() {
  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const secs = String(remainingSeconds % 60).padStart(2, "0");
  document.getElementById("timer-display").textContent = `${mins}:${secs}`;

  const totalSecs = presetMinutes * 60;
  const fraction = totalSecs > 0 ? remainingSeconds / totalSecs : 1;
  const offset = RING_CIRCUMFERENCE * (1 - fraction);
  document.getElementById("timer-ring").style.strokeDashoffset = offset.toFixed(1);
}

async function saveFocusSession(minutes) {
  if (minutes < 1) return;
  try {
    await fetch(`${API_BASE}/api/focus-sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        task_title: state.focusedTaskTitle,
        duration_minutes: minutes,
        today: getLocalToday(),
      }),
    });
    await loadDashboard();
  } catch {
    showError("Could not save focus session.");
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById("timer-toggle").textContent = "Start";
  document.getElementById("timer-state-label").textContent = "PAUSED";
}

function startTimer() {
  if (timerInterval) return;
  document.getElementById("timer-toggle").textContent = "Pause";
  document.getElementById("timer-state-label").textContent = "FOCUSING";

  timerInterval = setInterval(async () => {
    remainingSeconds--;
    updateTimerUI();
    if (remainingSeconds <= 0) {
      stopTimer();
      document.getElementById("timer-state-label").textContent = "DONE";
      await saveFocusSession(presetMinutes);
      remainingSeconds = presetMinutes * 60;
      updateTimerUI();
    }
  }, 1000);
}

document.getElementById("timer-toggle").addEventListener("click", () => {
  if (timerInterval) stopTimer();
  else startTimer();
});

document.getElementById("timer-reset").addEventListener("click", () => {
  stopTimer();
  remainingSeconds = presetMinutes * 60;
  document.getElementById("timer-state-label").textContent = "FOCUS";
  updateTimerUI();
});

document.getElementById("timer-complete").addEventListener("click", async () => {
  const elapsedMins = Math.max(1, Math.round((presetMinutes * 60 - remainingSeconds) / 60));
  stopTimer();
  remainingSeconds = presetMinutes * 60;
  document.getElementById("timer-state-label").textContent = "SAVED";
  updateTimerUI();
  await saveFocusSession(elapsedMins);
});

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    stopTimer();
    presetMinutes = Number(btn.dataset.mins) || 25;
    remainingSeconds = presetMinutes * 60;
    document.querySelectorAll(".preset-btn").forEach((b) => b.classList.toggle("active", b === btn));
    document.getElementById("timer-state-label").textContent = "FOCUS";
    updateTimerUI();
  });
});

routineDateInput.value = initToday;
noteDateInput.value = initToday;

initTheme();
setActiveView("overview");
updateTimerUI();

playDayflowTypewriter(() => {
  if (state.token) {
    loadDashboard();
  } else {
    showLanding();
  }
});
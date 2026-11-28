(function runEntryTypewriter() {
  const overlay = document.getElementById("entry-typewriter-overlay");
  const titleEl = document.getElementById("typewriter-target");
  const taglineEl = document.getElementById("typewriter-tagline");
  const cursorEl = document.getElementById("typewriter-cursor");

  if (!overlay || !titleEl || !taglineEl) {
    document.documentElement.classList.remove("df-intro-active");
    document.body.classList.remove("df-intro-active");
    return;
  }

  const brand = "DAYFLOW";
  const tagline = "Daily Focus & Planning";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function typeString(el, text, delay) {
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await wait(delay);
    }
  }

  async function start() {
    await wait(200);
    await typeString(titleEl, brand, 95);
    await wait(220);
    if (cursorEl) {
      cursorEl.style.fontSize = "1.2rem";
      cursorEl.style.color = "#94a3b8";
    }
    await typeString(taglineEl, tagline, 45);
    await wait(650);

    overlay.classList.add("is-done");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("df-intro-active");
    document.body.classList.remove("df-intro-active");

    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 520);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

const RENDER_API_BASE = "https://dayflow-backend-1jta.onrender.com";

const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "http://localhost:18080"
  : RENDER_API_BASE;
const THEME_KEY = "dayflow_theme";
const TOKEN_KEY = "dayflow_token";
const USER_KEY = "dayflow_user";
const CREDS_KEY = "dayflow_local_credentials_v1";
const META_PREFIX = "dayflow_user_meta_v2_";
const VIEW_KEY = "dayflow_active_view";
const OAUTH_STATE_KEY = "dayflow_oauth_state";
const OAUTH_PROVIDER_KEY = "dayflow_oauth_provider";
const OAUTH_VERIFIER_KEY = "dayflow_oauth_verifier";


const OAUTH_CONFIG = {
  googleClientId: "406890218377-5g5306c7f1ftgi31a08qh8oliomf0sv0.apps.googleusercontent.com",
  githubClientId: "",
};

const sidebarEl = document.getElementById("sidebar-drawer");
const authGateEl = document.getElementById("auth-gate");
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
const rewardPopupEl = document.getElementById("reward-popup");

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskDaySelect = document.getElementById("task-day-select");
const priorityInput = document.getElementById("task-priority");
const taskRewardInput = document.getElementById("task-reward-input");
const weeklyTasksGridEl = document.getElementById("weekly-tasks-grid");
const overviewTaskPreviewEl = document.getElementById("overview-task-preview");
const overviewHabitPreviewEl = document.getElementById("overview-habit-preview");

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
const habitStreakSeedInput = document.getElementById("habit-streak-seed");
const habitMatrixBodyEl = document.getElementById("habit-matrix-body");

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

function getMondayOfWeek(ymd) {
  const dt = parseYMD(ymd);
  const diff = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}

function getSundayOfWeek(ymd) {
  const dt = parseYMD(ymd);
  dt.setDate(dt.getDate() - dt.getDay());
  return dt;
}


function loadLocalCredentials() {
  try {
    return JSON.parse(localStorage.getItem(CREDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveLocalCredential(email, password, name) {
  const creds = loadLocalCredentials();
  const key = email.trim().toLowerCase();
  creds[key] = {
    email: key,
    password,
    name: name || creds[key]?.name || key.split("@")[0] || "Dayflow User",
  };
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}


function getUserAccountKey(userObj = state.user) {
  if (userObj?.id) return String(userObj.id);
  if (userObj?.provider && userObj?.provider_id) return `${userObj.provider}_${userObj.provider_id}`;
  if (userObj?.email) return `email_${userObj.email.trim().toLowerCase()}`;
  return "anonymous";
}

function createEmptyMeta() {
  return {
    taskRewards: {},
    taskDays: {},
    habitDays: {},
    habitStreaks: {},
    announcedRanks: {},
    localTasks: [],
    localHabits: [],
    localRoutines: [],
    localNotes: [],
    focusMinutesToday: 0,
    focusMinutesWeek: 0,
  };
}

function loadUserMeta(userObj = state.user) {
  const key = META_PREFIX + getUserAccountKey(userObj);
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return { ...createEmptyMeta(), ...parsed };
  } catch {
    return createEmptyMeta();
  }
}

function saveUserMeta(meta = state.meta, userObj = state.user) {
  const key = META_PREFIX + getUserAccountKey(userObj);
  localStorage.setItem(key, JSON.stringify(meta));
}

function getSavedView() {
  const hashView = window.location.hash.replace("#", "").trim();
  const valid = ["overview", "tasks", "calendar", "notes", "focus", "habits"];
  if (valid.includes(hashView)) return hashView;
  const stored = sessionStorage.getItem(VIEW_KEY);
  if (valid.includes(stored)) return stored;
  return "overview";
}

/* =========================================================================
 * DATA STRUCTURES USED IN DAYFLOW
 * 1. Singly Linked List: Task insertion & deletion
 * 2. Priority Sort: Urgent > High > Medium > Low
 * 3. LIFO Stack: Completed task history
 * 4. FIFO Queue: Pending tasks queue
 * ========================================================================= */
const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };

class DSNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

function insertTaskNode(head, task) {
  const newNode = new DSNode(task);
  if (!head) return newNode;
  let curr = head;
  while (curr.next) curr = curr.next;
  curr.next = newNode;
  return head;
}

function deleteTaskNode(head, taskId) {
  if (!head) return null;
  if (head.value.id === taskId) return head.next;
  let prev = head;
  let curr = head.next;
  while (curr) {
    if (curr.value.id === taskId) {
      prev.next = curr.next;
      return head;
    }
    prev = curr;
    curr = curr.next;
  }
  return head;
}

function sortByPriorityDesc(tasks) {
  return [...tasks].sort((a, b) => {
    const pA = PRIORITY_RANK[(a.priority || "medium").toLowerCase()] || 2;
    const pB = PRIORITY_RANK[(b.priority || "medium").toLowerCase()] || 2;
    return pB - pA;
  });
}

const completedStack = [];
const pendingQueue = [];

function enqueuePendingTask(task) {
  pendingQueue.push(task);
}

function dequeuePendingTask() {
  return pendingQueue.shift() || null;
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
  activeView: getSavedView(),
  tasksWeekStart: formatYMD(getMondayOfWeek(initToday)),
  routineDate: initToday,
  weekStartDate: formatYMD(getSundayOfWeek(initToday)),
  miniCalYear: initDateObj.getFullYear(),
  miniCalMonth: initDateObj.getMonth(),
  enabledCategories: new Set(["focus", "routine", "meeting", "important"]),
  selectedNoteDate: initToday,
  focusedTaskTitle: "Deep Focus Session",
  taskListHead: null,
  meta: createEmptyMeta(),
};

function syncTaskStructures(tasks) {
  state.taskListHead = null;
  pendingQueue.length = 0;
  for (const t of tasks || []) {
    state.taskListHead = insertTaskNode(state.taskListHead, t);
    if (!t.completed) enqueuePendingTask(t);
  }
}

function getStreakRank(days) {
  if (days >= 21) return { name: "Conqueror", badge: "👑 Conqueror", isConqueror: true };
  if (days >= 14) return { name: "Titan", badge: "⚡ Titan", isConqueror: false };
  if (days >= 7) return { name: "Vanguard", badge: "🛡️ Vanguard", isConqueror: false };
  if (days >= 3) return { name: "Momentum", badge: "🔥 Momentum", isConqueror: false };
  return { name: "Spark", badge: "✨ Spark", isConqueror: false };
}

let rewardTimeout = null;
function showRewardPopup(tag, title, desc, icon = "🏆") {
  if (!rewardPopupEl) return;
  document.getElementById("reward-popup-tag").textContent = tag;
  document.getElementById("reward-popup-title").textContent = title;
  document.getElementById("reward-popup-desc").textContent = desc;
  document.getElementById("reward-popup-icon").textContent = icon;
  rewardPopupEl.classList.remove("hidden");

  if (rewardTimeout) clearTimeout(rewardTimeout);
  rewardTimeout = setTimeout(() => {
    rewardPopupEl.classList.add("hidden");
  }, 4200);
}

document.getElementById("close-reward-popup")?.addEventListener("click", () => {
  rewardPopupEl?.classList.add("hidden");
});

function replaySmoothAnim(el) {
  if (!el) return;
  el.classList.remove("page-enter");
  void el.offsetWidth;
  el.classList.add("page-enter");
}

function openSidebar() {
  sidebarEl?.classList.remove("hidden");
}

function closeSidebar() {
  sidebarEl?.classList.add("hidden");
}

document.getElementById("hamburger-btn")?.addEventListener("click", () => {
  if (!sidebarEl) return;
  if (sidebarEl.classList.contains("hidden")) openSidebar();
  else closeSidebar();
});
document.getElementById("close-sidebar-btn")?.addEventListener("click", closeSidebar);

document.getElementById("brand-home-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  setActiveView("overview");
});

function authHeaders(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (state.token && !state.token.startsWith("local_")) {
    h["Authorization"] = `Bearer ${state.token}`;
  }
  return h;
}

/* ==================== OAUTH 2.0 + PKCE + SIGN IN / REGISTER ==================== */
function randomBase64Url(byteLen = 32) {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(plain) {
  const enc = new TextEncoder().encode(plain);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(hash);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function normalizeUserObject(rawUser = {}) {
  const provider = rawUser.provider || "local";
  const providerId = rawUser.provider_id || rawUser.sub || rawUser.id || "";
  const email = (rawUser.email || "").trim().toLowerCase();
  const id =
    rawUser.id ||
    (providerId ? `${provider}_${providerId}` : email ? `email_${email}` : "guest_default");

  return {
    id,
    provider,
    provider_id: providerId,
    name: rawUser.name || (email ? email.split("@")[0] : "Dayflow User"),
    email: email || `${id}@dayflow.local`,
  };
}

function setSession(rawUser, tokenStr = "") {
  const userObj = normalizeUserObject(rawUser);
  const sessionToken = tokenStr || `local_${userObj.id}_${randomBase64Url(6)}`;
  state.token = sessionToken;
  state.user = userObj;
  state.meta = loadUserMeta(userObj);
  localStorage.setItem(TOKEN_KEY, sessionToken);
  localStorage.setItem(USER_KEY, JSON.stringify(userObj));
  syncAuthControls();
}

function restoreSavedSession() {
  const savedToken = localStorage.getItem(TOKEN_KEY) || "";
  if (!savedToken) {
    state.meta = createEmptyMeta();
    return;
  }
  state.token = savedToken;
  try {
    const savedUser = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    if (savedUser) {
      state.user = normalizeUserObject(savedUser);
      state.meta = loadUserMeta(state.user);
    }
  } catch {
    state.user = null;
    state.meta = createEmptyMeta();
  }
}

function showAuthError(msg) {
  authErrorEl.textContent = msg;
  authErrorEl.classList.remove("hidden");
}

function openAuthModal(mode = "login", msg = "") {
  setAuthMode(mode);
  authGateEl.classList.remove("hidden");
  replaySmoothAnim(authGateEl.querySelector(".auth-card"));
  if (msg) {
    showAuthError(msg);
  } else {
    authErrorEl.classList.add("hidden");
  }
  setTimeout(() => {
    const targetInput = mode === "register" ? authNameInput : authEmailInput;
    targetInput?.focus();
  }, 40);
}

function closeAuthModal() {
  authGateEl.classList.add("hidden");
  authErrorEl.classList.add("hidden");
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isReg = mode === "register";
  authTabLoginEl.classList.toggle("active", !isReg);
  authTabRegisterEl.classList.toggle("active", isReg);
  authNameWrapEl.classList.toggle("hidden", !isReg);
  authNameInput.required = isReg;
  authSubmitBtn.textContent = isReg ? "Create Account" : "Sign In";
  authErrorEl.classList.add("hidden");
}

document.getElementById("open-auth-topbar-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  openAuthModal("login");
});

document.getElementById("close-auth-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  closeAuthModal();
});

authGateEl?.addEventListener("click", (e) => {
  if (e.target === authGateEl) {
    closeAuthModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && authGateEl && !authGateEl.classList.contains("hidden")) {
    closeAuthModal();
  }
});

authTabLoginEl.addEventListener("click", () => setAuthMode("login"));
authTabRegisterEl.addEventListener("click", () => setAuthMode("register"));

function syncAuthControls() {
  const signedIn = Boolean(state.token);
  document.getElementById("open-auth-topbar-btn")?.classList.toggle("hidden", signedIn);
  document.getElementById("user-badge")?.classList.toggle("hidden", !signedIn);
  document.getElementById("logout-btn")?.classList.toggle("hidden", !signedIn);
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `HTTP ${res.status}` };
  }
}


function signInWithLocalAccount(emailRaw, password, nameRaw, isReg) {
  const email = emailRaw.trim().toLowerCase();
  const creds = loadLocalCredentials();
  const existing = creds[email];

  if (existing && existing.password !== password) {
    showAuthError("Incorrect password for this account. Please try again.");
    return false;
  }

  const resolvedName =
    (nameRaw || "").trim() ||
    existing?.name ||
    email.split("@")[0] ||
    "Dayflow User";

  saveLocalCredential(email, password, resolvedName);
  setSession({
    id: `local_acct_${email}`,
    provider: isReg ? "local_register" : "local_login",
    name: resolvedName,
    email,
  });
  return true;
}

/* OAuth Callback Handler */
async function handleOAuthCallbackIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const returnedState = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) {
    window.history.replaceState(null, "", window.location.pathname + (window.location.hash || "#overview"));
    openAuthModal("login", `OAuth sign-in cancelled (${oauthError}).`);
    return;
  }

  if (code) {
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    const provider = sessionStorage.getItem(OAUTH_PROVIDER_KEY) || "oauth";
    const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY) || "";

    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
    sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
    window.history.replaceState(null, "", window.location.pathname + (window.location.hash || "#overview"));

    if (!expectedState || returnedState !== expectedState) {
      openAuthModal("login", "Security check failed (OAuth state mismatch). Please try again.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/oauth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          code,
          code_verifier: verifier,
          redirect_uri: window.location.origin + window.location.pathname,
        }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.token && data.user) {
        setSession({ ...data.user, provider }, data.token);
        closeAuthModal();
        clearError();
        await loadDashboard();
        return;
      }
      openAuthModal("login", data.error || data.message || "Could not complete OAuth sign-in.");
    } catch {
      openAuthModal("login", `Could not reach backend (${API_BASE}) to complete OAuth sign-in.`);
    }
  }
}

/* Starts Google or GitHub OAuth flow */
async function startSecureOAuth(provider) {
  const oauthState = randomBase64Url(24);
  sessionStorage.setItem(OAUTH_STATE_KEY, oauthState);
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
  const redirectUri = window.location.origin + window.location.pathname;

  if (provider === "google" && OAUTH_CONFIG.googleClientId) {
    const verifier = randomBase64Url(48);
    const challenge = await sha256Base64Url(verifier);
    sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", OAUTH_CONFIG.googleClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", oauthState);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("prompt", "select_account");
    window.location.assign(authUrl.toString());
    return;
  }

  if (provider === "github" && OAUTH_CONFIG.githubClientId) {
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", OAUTH_CONFIG.githubClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", oauthState);
    window.location.assign(authUrl.toString());
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/auth/oauth/${provider}/url?state=${encodeURIComponent(oauthState)}&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
    if (res.ok) {
      const data = await parseJsonSafe(res);
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
    }
  } catch {
    // Backend OAuth URL route not configured yet
  }

  showAuthError(
    `${provider === "google" ? "Google" : "GitHub"} OAuth Client ID is not configured yet. Add your Client ID in OAUTH_CONFIG and wire /api/auth/oauth/exchange on your backend.`
  );
}

authFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const name = authNameInput.value.trim() || email.split("@")[0] || "Dayflow User";

  if (!email || !password) {
    showAuthError("Please enter both email and password.");
    return;
  }

  const isReg = state.authMode === "register";
  const endpoint = isReg ? "/api/auth/register" : "/api/auth/login";

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = isReg ? "Creating..." : "Signing In...";

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await parseJsonSafe(res);

    if (res.ok && (data.token || data.user)) {
      const userObj = data.user || { name, email, provider: "password" };
      saveLocalCredential(email, password, userObj.name || name);
      setSession(userObj, data.token || "");
      authPasswordInput.value = "";
      closeAuthModal();
      clearError();
      await loadDashboard();
      return;
    }

    
    const okLocal = signInWithLocalAccount(email, password, name, isReg);
    if (!okLocal) return;
    authPasswordInput.value = "";
    closeAuthModal();
    await loadDashboard();
    showError(
      data.error ||
        `Backend returned HTTP ${res.status} on ${endpoint} — signed in with local account for ${email}.`
    );
  } catch {
    const okLocal = signInWithLocalAccount(email, password, name, isReg);
    if (!okLocal) return;
    authPasswordInput.value = "";
    closeAuthModal();
    await loadDashboard();
    showError(`Backend (${API_BASE}) unreachable — signed in with local account for ${email}.`);
  } finally {
    authSubmitBtn.disabled = false;
    setAuthMode(state.authMode);
  }
});

document.getElementById("btn-google-auth")?.addEventListener("click", (e) => {
  e.preventDefault();
  startSecureOAuth("google");
});

document.getElementById("btn-github-auth")?.addEventListener("click", (e) => {
  e.preventDefault();
  startSecureOAuth("github");
});

document.getElementById("btn-guest-auth")?.addEventListener("click", (e) => {
  e.preventDefault();
  setSession({
    id: "guest_local",
    provider: "guest",
    name: "Guest User",
    email: "guest@dayflow.local",
  });
  closeAuthModal();
  loadDashboard();
});

document.getElementById("logout-btn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (state.user) {
    saveUserMeta(state.meta, state.user);
  }
  try {
    if (state.token && !state.token.startsWith("local_")) {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    }
  } catch {
    // Ignore logout network errors
  } finally {
    state.token = "";
    state.user = null;
    state.tasks = [];
    state.habits = [];
    state.notes = [];
    state.routines = [];
    state.meta = createEmptyMeta();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    syncAuthControls();
    setActiveView("overview", { animate: false });
    renderAllSections();
  }
});

function updateHeaderDate() {
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Welcome back";
  const displayName = state.user?.name || "to DAYFLOW";
  document.getElementById("greeting-title").textContent = state.user?.name
    ? `${greet}, ${displayName}`
    : `${greet} ${displayName}`;
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

function setActiveView(view, { animate = true } = {}) {
  if (!view) return;
  state.activeView = view;
  sessionStorage.setItem(VIEW_KEY, view);
  if (window.location.hash !== `#${view}`) {
    history.replaceState(null, "", `#${view}`);
  }

  document.querySelectorAll(".nav-btn, .top-tab-btn").forEach((btn) => {
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
    if (isTarget && animate) {
      replaySmoothAnim(el);
    }
  });

  const subtitles = {
    overview: "Overview · Daily Focus & Planning",
    tasks: "Tasks · Weekly 7-day planner & custom rewards",
    calendar: "Calendar · Weekly routine schedule & important blocks",
    notes: "Notes · Daily notepad & saved history",
    focus: "Focus · Pomodoro timer and logged focus minutes",
    habits: "Habits · Weekly check-ins, progress bars & streak ranks",
  };
  document.getElementById("view-subtitle").textContent = subtitles[view] || "";
}

document.querySelectorAll(".nav-btn, .top-tab-btn, [data-jump]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const target = btn.dataset.view || btn.dataset.jump;
    if (target) {
      setActiveView(target, { animate: true });
      closeSidebar();
    }
  });
});

window.addEventListener("hashchange", () => {
  const hv = getSavedView();
  if (hv !== state.activeView) {
    setActiveView(hv, { animate: false });
  }
});

function showError(msg) {
  bannerEl.textContent = msg;
  bannerEl.classList.remove("hidden");
}

function clearError() {
  bannerEl.textContent = "";
  bannerEl.classList.add("hidden");
}

function ensureDefaultSummary() {
  if (!state.summary) {
    state.summary = {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      completion_rate: 0,
      today_focus_minutes: state.meta.focusMinutesToday || 0,
      week_focus_minutes: state.meta.focusMinutesWeek || 0,
      habits_done_today: 0,
      habits_total: 0,
      flow_score: 0,
      weekly: [
        { label: "Mon", score: 42, focus_minutes: 25 },
        { label: "Tue", score: 58, focus_minutes: 45 },
        { label: "Wed", score: 50, focus_minutes: 30 },
        { label: "Thu", score: 74, focus_minutes: 60 },
        { label: "Fri", score: 66, focus_minutes: 40 },
        { label: "Sat", score: 80, focus_minutes: 75 },
        { label: "Sun", score: 72, focus_minutes: 50 },
      ],
    };
  }
}

function renderAllSections() {
  ensureDefaultSummary();
  syncTaskStructures(state.tasks);
  updateHeaderDate();
  renderSummary();
  renderOverviewPreview();
  renderWeeklyTasksBoard();
  renderMiniCalendar();
  renderCalendarGrid();
  renderNotesHistory();
  renderHabitMatrix();
  setActiveView(state.activeView, { animate: false });
}

function renderSummary() {
  const s = state.summary;
  if (!s) return;

  const totalTasks = state.tasks.length || s.total;
  const doneTasks = state.tasks.length ? state.tasks.filter((t) => t.completed).length : s.completed;
  const pendingTasks = Math.max(0, totalTasks - doneTasks);
  const overdueTasks = state.tasks.length ? state.tasks.filter((t) => t.overdue).length : s.overdue;
  const rate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : s.completion_rate;

  document.getElementById("pill-total").textContent = totalTasks;
  document.getElementById("pill-done").textContent = doneTasks;
  document.getElementById("pill-overdue").textContent = overdueTasks;

  const prioritized = sortByPriorityDesc(state.tasks);
  const nextTask = prioritized.find((t) => !t.completed) || dequeuePendingTask();
  document.getElementById("hero-task-title").textContent = nextTask ? nextTask.title : "Plan key deliverables";
  document.getElementById("hero-prio-badge").textContent = nextTask ? nextTask.priority.toUpperCase() : "READY";
  document.getElementById("hero-focus-total").textContent = `${s.today_focus_minutes}m focused today`;
  document.getElementById("hero-deadline").textContent = nextTask && nextTask.due_at
    ? `Deadline: ${nextTask.due_at}`
    : "Jump to Tasks, Calendar, Notes or Focus";

  document.getElementById("flow-score-val").textContent = s.flow_score;
  document.getElementById("flow-breakdown").textContent =
    `Tasks ${rate}% · Focus ${s.today_focus_minutes}m · Habits ${s.habits_done_today}/${state.habits.length || s.habits_total}`;

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
      <strong>${doneTasks} of ${totalTasks} tasks completed</strong>
      <span>${overdueTasks > 0 ? `${overdueTasks} overdue task needs attention` : "Zero overdue tasks right now"}</span>
    </div>
    <div class="insight-item">
      <strong>${s.today_focus_minutes}m deep focus logged today</strong>
      <span>Target: 60m daily focus momentum</span>
    </div>
    <div class="insight-item">
      <strong>Habits: ${s.habits_done_today}/${state.habits.length || s.habits_total} checked in</strong>
      <span>21-day streak unlocks Conqueror rank</span>
    </div>
  `;

  document.getElementById("gauge-ratio").textContent = `${doneTasks}/${totalTasks}`;
  document.getElementById("gauge-percent-text").textContent = `${rate}%`;
  document.getElementById("gauge-completed").textContent = doneTasks;
  document.getElementById("gauge-pending").textContent = pendingTasks;
  document.getElementById("gauge-overdue").textContent = overdueTasks;

  renderArcGauge(rate);
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
  const sortedTasks = sortByPriorityDesc(state.tasks);
  if (!sortedTasks.length) {
    overviewTaskPreviewEl.innerHTML = `<li class="muted-small">No tasks yet. Open Tasks tab to add items.</li>`;
  } else {
    sortedTasks.slice(0, 5).forEach((t) => {
      const reward = state.meta.taskRewards?.[t.id];
      const li = document.createElement("li");
      li.className = "readonly-row";
      li.innerHTML = `
        <div>
          <span class="task-title ${t.completed ? "done" : ""}">${t.title}</span>
          ${reward ? `<div class="day-task-reward">🎁 ${reward}</div>` : ""}
        </div>
        <span class="badge priority-${t.priority}">${t.priority.toUpperCase()}</span>
      `;
      overviewTaskPreviewEl.appendChild(li);
    });
  }

  overviewHabitPreviewEl.innerHTML = "";
  if (!state.habits.length) {
    overviewHabitPreviewEl.innerHTML = `<li class="muted-small">No habits yet. Open Habits tab to track streaks.</li>`;
  } else {
    state.habits.slice(0, 5).forEach((h) => {
      const streakDays = getHabitStreakDays(h);
      const rank = getStreakRank(streakDays);
      const li = document.createElement("li");
      li.className = "readonly-row";
      li.innerHTML = `
        <span class="task-title">${h.title}</span>
        <span class="rank-pill ${rank.isConqueror ? "conqueror" : ""}">${rank.badge} · ${streakDays}d</span>
      `;
      overviewHabitPreviewEl.appendChild(li);
    });
  }
}

/* Weekly 7-Day Tasks Board (Monday -> Sunday) */
function getMonToSunDays(weekStartYmd) {
  const start = parseYMD(weekStartYmd);
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const list = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    list.push({
      ymd: formatYMD(d),
      dayName: names[i],
      dateLabel: `${dd}.${mm}.${yyyy}`,
      jsDay: d.getDay(),
    });
  }
  return list;
}

function getTaskDayYmd(task, weekDays) {
  if (state.meta.taskDays?.[task.id]) {
    const mapped = state.meta.taskDays[task.id];
    if (weekDays.some((wd) => wd.ymd === mapped)) return mapped;
  }
  if (task.due_at && weekDays.some((wd) => wd.ymd === task.due_at)) {
    return task.due_at;
  }
  return getLocalToday();
}

function renderWeeklyTasksBoard() {
  const weekDays = getMonToSunDays(state.tasksWeekStart);
  document.getElementById("tasks-week-range").textContent =
    `${weekDays[0].dateLabel} – ${weekDays[6].dateLabel}`;

  weeklyTasksGridEl.innerHTML = "";
  const r = 28;
  const circ = 2 * Math.PI * r;

  weekDays.forEach((wd) => {
    const dayTasks = sortByPriorityDesc(
      state.tasks.filter((t) => getTaskDayYmd(t, weekDays) === wd.ymd)
    );
    const total = dayTasks.length;
    const done = dayTasks.filter((t) => t.completed).length;
    const left = Math.max(0, total - done);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const offset = circ * (1 - pct / 100);
    const allDone = total > 0 && done === total;

    const col = document.createElement("div");
    col.className = "day-planner-col";

    col.innerHTML = `
      <div class="day-col-header">
        <div class="day-col-name">${wd.dayName}</div>
        <div class="day-col-date">${wd.dateLabel}</div>
        <div class="day-ring-wrap">
          <svg viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="${r}" class="day-ring-bg"></circle>
            <circle
              cx="36"
              cy="36"
              r="${r}"
              class="day-ring-fg"
              style="stroke-dasharray:${circ.toFixed(1)};stroke-dashoffset:${offset.toFixed(1)};"
            ></circle>
          </svg>
          <span class="day-ring-pct">${pct}%</span>
        </div>
      </div>
      <div class="day-col-subbar">Tasks</div>
    `;

    const ul = document.createElement("ul");
    ul.className = "day-col-tasks";

    if (!dayTasks.length) {
      ul.innerHTML = `<li class="muted-small" style="padding:8px;text-align:center;">No tasks</li>`;
    } else {
      dayTasks.forEach((t) => {
        const reward = state.meta.taskRewards?.[t.id] || "";
        const li = document.createElement("li");
        li.className = `day-task-row ${t.completed ? "is-done" : ""}`;

        const main = document.createElement("div");
        main.className = "day-task-main";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = t.completed;
        cb.addEventListener("change", (ev) => {
          ev.stopPropagation();
          toggleTask(t, cb.checked, reward);
        });

        const textWrap = document.createElement("div");
        textWrap.innerHTML = `
          <span class="day-task-title ${t.completed ? "done" : ""}">${t.title}</span>
          ${reward ? `<span class="day-task-reward">🎁 ${reward}</span>` : ""}
        `;

        main.appendChild(cb);
        main.appendChild(textWrap);

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "day-task-del";
        delBtn.textContent = "×";
        delBtn.title = "Delete task";
        delBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          deleteTask(t.id);
        });

        li.appendChild(main);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
    }

    const footer = document.createElement("div");
    footer.className = "day-col-footer";
    footer.innerHTML = `
      <div class="day-stat-line">
        <span>Done</span>
        <span>${done} / ${total}</span>
        <span class="day-trophy-cell">${allDone ? "🏆" : "⏳"}</span>
      </div>
      <div class="day-stat-line">
        <span>Left</span>
        <span>${left}</span>
        <span class="day-trophy-cell">${left === 0 && total > 0 ? "✓" : ""}</span>
      </div>
    `;

    col.appendChild(ul);
    col.appendChild(footer);
    weeklyTasksGridEl.appendChild(col);
  });
}

document.getElementById("tasks-prev-week")?.addEventListener("click", () => {
  const dt = parseYMD(state.tasksWeekStart);
  dt.setDate(dt.getDate() - 7);
  state.tasksWeekStart = formatYMD(dt);
  renderWeeklyTasksBoard();
});

document.getElementById("tasks-next-week")?.addEventListener("click", () => {
  const dt = parseYMD(state.tasksWeekStart);
  dt.setDate(dt.getDate() + 7);
  state.tasksWeekStart = formatYMD(dt);
  renderWeeklyTasksBoard();
});

taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!state.token) {
    openAuthModal("login", "Sign in or use Guest Mode to save tasks.");
    return;
  }
  const title = taskInput.value.trim();
  if (!title) return;

  const targetJsDay = Number(taskDaySelect.value);
  const weekDays = getMonToSunDays(state.tasksWeekStart);
  const matchedDay = weekDays.find((d) => d.jsDay === targetJsDay) || weekDays[0];
  const rewardText = taskRewardInput.value.trim();
  const prio = priorityInput.value || "medium";

  try {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        priority: prio,
        due_at: matchedDay.ymd,
      }),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    const createdId = created.id || created.task?.id || Date.now();
    state.meta.taskDays[createdId] = matchedDay.ymd;
    if (rewardText) state.meta.taskRewards[createdId] = rewardText;
    saveUserMeta();
    state.taskListHead = insertTaskNode(state.taskListHead, {
      id: createdId,
      title,
      priority: prio,
      due_at: matchedDay.ymd,
      completed: false,
    });
  } catch {
    const localTask = {
      id: `local_t_${Date.now()}`,
      title,
      priority: prio,
      due_at: matchedDay.ymd,
      completed: false,
      overdue: false,
    };
    state.meta.localTasks.push(localTask);
    state.meta.taskDays[localTask.id] = matchedDay.ymd;
    if (rewardText) state.meta.taskRewards[localTask.id] = rewardText;
    saveUserMeta();
  }

  taskInput.value = "";
  taskRewardInput.value = "";
  priorityInput.value = "medium";
  await loadDashboard();
});

async function toggleTask(taskObj, completed, rewardText = "") {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${taskObj.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ completed, today: getLocalToday() }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localTasks = state.meta.localTasks.map((t) =>
      t.id === taskObj.id ? { ...t, completed } : t
    );
    saveUserMeta();
  }

  if (completed) {
    completedStack.push({ ...taskObj, completed: true });
    if (rewardText) {
      showRewardPopup("REWARD UNLOCKED", rewardText, `Completed: "${taskObj.title}"`, "🎁");
    } else {
      showRewardPopup("TASK COMPLETED", `"${taskObj.title}" done!`, "Great momentum today.", "✅");
    }
  }
  await loadDashboard();
}

async function deleteTask(id) {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localTasks = state.meta.localTasks.filter((t) => t.id !== id);
  }
  state.taskListHead = deleteTaskNode(state.taskListHead, id);
  delete state.meta.taskRewards[id];
  delete state.meta.taskDays[id];
  saveUserMeta();
  await loadDashboard();
}

/* Habit Tracker Matrix (Mon-Sun + Progress + Ranks) */
function getHabitCheckedDays(habit) {
  if (Array.isArray(state.meta.habitDays?.[habit.id])) {
    return state.meta.habitDays[habit.id];
  }
  const count = Math.min(7, Math.max(0, Number(habit.week_count) || 0));
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(i);
  if (habit.completed_today && !arr.includes(3)) {
    arr[0] = 3;
  }
  return arr;
}

function getHabitStreakDays(habit) {
  const baseSeed = Number(state.meta.habitStreaks?.[habit.id] || 0);
  const weekDaysCount = getHabitCheckedDays(habit).length;
  return baseSeed + weekDaysCount;
}

function renderHabitMatrix() {
  habitMatrixBodyEl.innerHTML = "";
  if (!state.habits.length) {
    habitMatrixBodyEl.innerHTML = `<tr><td colspan="11" class="muted-small" style="padding:18px;">No habits added yet. Add a habit above to track Mon–Sun and streak ranks.</td></tr>`;
    return;
  }

  state.habits.forEach((h) => {
    const checkedDays = getHabitCheckedDays(h);
    const pct = Math.round((checkedDays.length / 7) * 100);
    const streakDays = getHabitStreakDays(h);
    const rank = getStreakRank(streakDays);

    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.className = "col-habit";
    nameTd.textContent = h.title;
    tr.appendChild(nameTd);

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const td = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = checkedDays.includes(dayIdx);
      cb.addEventListener("change", (ev) => {
        ev.stopPropagation();
        toggleHabitDay(h, dayIdx, cb.checked);
      });
      td.appendChild(cb);
      tr.appendChild(td);
    }

    const rankTd = document.createElement("td");
    rankTd.innerHTML = `<span class="rank-pill ${rank.isConqueror ? "conqueror" : ""}">${rank.badge} · ${streakDays}d</span>`;
    tr.appendChild(rankTd);

    const progTd = document.createElement("td");
    progTd.innerHTML = `
      <div class="progress-cell-wrap">
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%;"></div>
        </div>
        <span class="progress-pct-label">${pct === 100 ? "🏆" : `${pct}%`}</span>
      </div>
    `;
    tr.appendChild(progTd);

    const actTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-ghost del";
    delBtn.textContent = "×";
    delBtn.title = "Delete habit";
    delBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      deleteHabit(h.id);
    });
    actTd.appendChild(delBtn);
    tr.appendChild(actTd);

    habitMatrixBodyEl.appendChild(tr);
  });
}

async function toggleHabitDay(habit, dayIdx, isChecked) {
  if (!state.token) return openAuthModal("login");
  const current = new Set(getHabitCheckedDays(habit));
  if (isChecked) current.add(dayIdx);
  else current.delete(dayIdx);

  state.meta.habitDays[habit.id] = Array.from(current);
  saveUserMeta();

  const newStreak = getHabitStreakDays(habit);
  const rank = getStreakRank(newStreak);
  const prevAnnounced = state.meta.announcedRanks?.[habit.id] || "";
  if (isChecked && rank.name !== "Spark" && rank.name !== prevAnnounced) {
    state.meta.announcedRanks[habit.id] = rank.name;
    saveUserMeta();
    showRewardPopup("STREAK RANK UP!", `${habit.title} → ${rank.badge}`, `${newStreak} days streak reached!`, "👑");
  }

  try {
    await fetch(`${API_BASE}/api/habits/${habit.id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ today: getLocalToday() }),
    });
  } catch {
    // Saved under current user's meta
  }
  await loadDashboard();
}

habitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!state.token) {
    openAuthModal("login", "Sign in or use Guest Mode to add habits.");
    return;
  }
  const title = habitInput.value.trim();
  if (!title) return;
  const seedDays = Math.max(0, Number(habitStreakSeedInput.value) || 0);

  try {
    const res = await fetch(`${API_BASE}/api/habits`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed");
    const created = await res.json();
    const createdId = created.id || created.habit?.id || Date.now();
    if (seedDays > 0) {
      state.meta.habitStreaks[createdId] = seedDays;
      saveUserMeta();
      const rank = getStreakRank(seedDays);
      if (rank.name !== "Spark") {
        showRewardPopup("RANK ASSIGNED", `${title} → ${rank.badge}`, `Starting with ${seedDays} streak days.`, "🔥");
      }
    }
  } catch {
    const localHabit = {
      id: `local_h_${Date.now()}`,
      title,
      completed_today: false,
      week_count: 0,
    };
    state.meta.localHabits.push(localHabit);
    if (seedDays > 0) state.meta.habitStreaks[localHabit.id] = seedDays;
    saveUserMeta();
  }

  habitInput.value = "";
  habitStreakSeedInput.value = "";
  await loadDashboard();
});

async function deleteHabit(id) {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/habits/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localHabits = state.meta.localHabits.filter((h) => h.id !== id);
  }
  delete state.meta.habitDays[id];
  delete state.meta.habitStreaks[id];
  delete state.meta.announcedRanks[id];
  saveUserMeta();
  await loadDashboard();
}

/* Calendar */
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
      if (weekChanged && state.token) await loadDashboard();
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

function mergeUserFallbackData() {
  state.tasks = [...(state.meta.localTasks || [])];
  state.habits = [...(state.meta.localHabits || [])];
  state.routines = [...(state.meta.localRoutines || [])];
  state.notes = [...(state.meta.localNotes || [])];
}

async function loadDashboard() {
  syncAuthControls();
  if (!state.token) {
    renderAllSections();
    return;
  }

  if (state.token.startsWith("local_")) {
    mergeUserFallbackData();
    renderAllSections();
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
      mergeUserFallbackData();
      renderAllSections();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    clearError();

    if (data.user) {
      state.user = normalizeUserObject({ ...state.user, ...data.user });
      state.meta = { ...loadUserMeta(state.user), ...state.meta };
      saveUserMeta();
    }

    state.tasks = [...(data.tasks || []), ...(state.meta.localTasks || [])];
    state.habits = [...(data.habits || []), ...(state.meta.localHabits || [])];
    state.notes = [...(data.notes || []), ...(state.meta.localNotes || [])];
    state.routines = [...(data.routines || []), ...(state.meta.localRoutines || [])];
    state.summary = data.summary || state.summary;

    const firstOpen = sortByPriorityDesc(state.tasks).find((t) => !t.completed);
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

    renderAllSections();
  } catch {
    mergeUserFallbackData();
    renderAllSections();
    showError(`Backend connection failed (${API_BASE}) — showing account local data.`);
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
  if (state.token) await loadDashboard();
  else {
    renderMiniCalendar();
    renderCalendarGrid();
  }
});

document.getElementById("cal-prev-week").addEventListener("click", async () => {
  const dt = parseYMD(state.weekStartDate);
  dt.setDate(dt.getDate() - 7);
  state.weekStartDate = formatYMD(dt);
  state.routineDate = state.weekStartDate;
  routineDateInput.value = state.routineDate;
  state.miniCalYear = dt.getFullYear();
  state.miniCalMonth = dt.getMonth();
  if (state.token) await loadDashboard();
  else {
    renderMiniCalendar();
    renderCalendarGrid();
  }
});

document.getElementById("cal-next-week").addEventListener("click", async () => {
  const dt = parseYMD(state.weekStartDate);
  dt.setDate(dt.getDate() + 7);
  state.weekStartDate = formatYMD(dt);
  state.routineDate = state.weekStartDate;
  routineDateInput.value = state.routineDate;
  state.miniCalYear = dt.getFullYear();
  state.miniCalMonth = dt.getMonth();
  if (state.token) await loadDashboard();
  else {
    renderMiniCalendar();
    renderCalendarGrid();
  }
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
  e.stopPropagation();
  if (!state.token) {
    openAuthModal("login", "Sign in or use Guest Mode to save routine blocks.");
    return;
  }
  const title = routineTitleInput.value.trim();
  if (!title) return;

  const chosenDate = routineDateInput.value || state.routineDate;
  state.routineDate = chosenDate;
  state.weekStartDate = formatYMD(getSundayOfWeek(chosenDate));

  const payload = {
    block_date: chosenDate,
    start_time: routineStartInput.value || "09:00",
    end_time: routineEndInput.value || "10:00",
    title,
    category: routineCategoryInput.value || "routine",
    important: routineImportantInput.checked,
    completed: false,
  };

  try {
    const res = await fetch(`${API_BASE}/api/routines`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localRoutines.push({ id: `local_r_${Date.now()}`, ...payload });
    saveUserMeta();
  }

  routineTitleInput.value = "";
  routineImportantInput.checked = false;
  await loadDashboard();
});

async function toggleRoutine(id) {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/routines/${id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localRoutines = state.meta.localRoutines.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    saveUserMeta();
  }
  await loadDashboard();
}

async function deleteRoutine(id) {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/routines/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localRoutines = state.meta.localRoutines.filter((r) => r.id !== id);
    saveUserMeta();
  }
  await loadDashboard();
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
  e.stopPropagation();
  if (!state.token) {
    openAuthModal("login", "Sign in or use Guest Mode to save notes.");
    return;
  }
  const nDate = noteDateInput.value || getLocalToday();
  const title = noteTitleInput.value.trim() || `Note (${nDate})`;
  const content = noteContentInput.value;

  try {
    const res = await fetch(`${API_BASE}/api/notes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ note_date: nDate, title, content }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    const existingIdx = state.meta.localNotes.findIndex((n) => n.note_date === nDate);
    const entry = { id: `local_n_${Date.now()}`, note_date: nDate, title, content };
    if (existingIdx >= 0) state.meta.localNotes[existingIdx] = entry;
    else state.meta.localNotes.push(entry);
    saveUserMeta();
  }

  state.selectedNoteDate = nDate;
  delete noteContentInput.dataset.dirty;
  await loadDashboard();
});

async function deleteNote(id) {
  if (!state.token) return openAuthModal("login");
  try {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.localNotes = state.meta.localNotes.filter((n) => n.id !== id);
    saveUserMeta();
  }
  await loadDashboard();
}

const RING_CIRCUMFERENCE = 703.72;
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
  if (!state.token) {
    openAuthModal("login", "Sign in or use Guest Mode to log focus sessions.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/focus-sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        task_title: state.focusedTaskTitle,
        duration_minutes: minutes,
        today: getLocalToday(),
      }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    state.meta.focusMinutesToday = (state.meta.focusMinutesToday || 0) + minutes;
    state.meta.focusMinutesWeek = (state.meta.focusMinutesWeek || 0) + minutes;
    saveUserMeta();
    ensureDefaultSummary();
    state.summary.today_focus_minutes += minutes;
    state.summary.week_focus_minutes += minutes;
  }
  await loadDashboard();
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

restoreSavedSession();
initTheme();
syncAuthControls();
setActiveView(state.activeView, { animate: false });
updateTimerUI();
renderAllSections();

handleOAuthCallbackIfPresent().then(() => {
  if (state.token) {
    loadDashboard();
  }
});
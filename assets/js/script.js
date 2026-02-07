"use strict";

/**
 * Work Day Scheduler — Modern Refresh
 * - No jQuery, no Moment
 * - Dynamic time blocks
 * - Per-day localStorage
 * - Priorities
 * - Autosave (blur), Save button, Cmd/Ctrl+Enter
 * - Now indicator line
 * - Dark mode toggle + persistence
 * - Clear Day resets display + storage
 */

const HOURS = { start: 9, end: 17 }; // inclusive
const STORAGE_PREFIX = "workday-scheduler.v2";
const THEME_KEY = `${STORAGE_PREFIX}.theme`;

const el = {
  currentDay: document.getElementById("currentDay"),
  status: document.getElementById("status"),
  schedule: document.getElementById("schedule"),
  nowLine: document.getElementById("nowLine"),
  clearDay: document.getElementById("clearDay"),
  themeToggle: document.getElementById("themeToggle"),
  toast: document.getElementById("toast"),
};

const state = {
  dateKey: "",
  tasks: {}, // hour -> { text: string, priority: "low"|"medium"|"high" }
  theme: "light",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatHeaderDate() {
  const d = new Date();
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function storageKeyForToday() {
  return `${STORAGE_PREFIX}.tasks.${state.dateKey}`;
}

function setStatus(msg) {
  el.status.textContent = msg || "";
}

let toastTimer = null;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1300);
}

function hourLabel(hour24) {
  const d = new Date();
  d.setHours(hour24, 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function isTodayWorkHours(hour24) {
  const now = new Date();
  const currentHour = now.getHours();
  return hour24 === currentHour;
}

function blockTimeClass(hour24) {
  const now = new Date();
  const currentHour = now.getHours();

  if (hour24 < currentHour) return "block-past";
  if (hour24 === currentHour) return "block-present";
  return "block-future";
}

function defaultTaskForHour() {
  return { text: "", priority: "low" };
}

/**
 * Load/save
 */
function loadTasks() {
  state.dateKey = getTodayKey();

  try {
    const raw = localStorage.getItem(storageKeyForToday());
    const parsed = raw ? JSON.parse(raw) : {};
    state.tasks = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    state.tasks = {};
  }
}

function saveTasks() {
  localStorage.setItem(storageKeyForToday(), JSON.stringify(state.tasks));
}

function clearTasks() {
  state.tasks = {};
  localStorage.removeItem(storageKeyForToday());
}

/**
 * Theme
 */
function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  state.theme = saved === "dark" ? "dark" : "light";
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  el.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
  localStorage.setItem(THEME_KEY, state.theme);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  showToast(state.theme === "dark" ? "Dark mode on" : "Light mode on");
}

/**
 * UI rendering
 */
function buildTimeBlock(hour24) {
  const block = document.createElement("div");
  block.className = `timeblock ${blockTimeClass(hour24)}`;
  block.dataset.hour = String(hour24);

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = hourLabel(hour24);

  const editor = document.createElement("textarea");
  editor.className = "editor";
  editor.rows = 2;
  editor.placeholder = "Add a task…";

  const saved = state.tasks[String(hour24)] || defaultTaskForHour();
  editor.value = saved.text || "";

  // Priority + helper pill
  const controls = document.createElement("div");
  controls.className = "controls";

  const prioritySelect = document.createElement("select");
  prioritySelect.className = "select";
  prioritySelect.setAttribute(
    "aria-label",
    `Priority for ${hourLabel(hour24)}`
  );

  const options = [
    { value: "low", label: "Priority: Low" },
    { value: "medium", label: "Priority: Medium" },
    { value: "high", label: "Priority: High" },
  ];

  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    prioritySelect.appendChild(opt);
  });

  prioritySelect.value = saved.priority || "low";

  const pill = document.createElement("span");
  pill.className = `priority priority-${prioritySelect.value}`;
  pill.textContent =
    prioritySelect.value === "high"
      ? "High"
      : prioritySelect.value === "medium"
      ? "Medium"
      : "Low";

  controls.appendChild(prioritySelect);
  controls.appendChild(pill);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "save";
  saveBtn.setAttribute("aria-label", `Save task for ${hourLabel(hour24)}`);
  saveBtn.textContent = "Save";

  // Events
  const saveThisBlock = () => {
    const text = editor.value.trim();
    const priority = prioritySelect.value;

    state.tasks[String(hour24)] = { text, priority };
    saveTasks();
    setStatus("Saved.");
    showToast("Saved");
  };

  // Save on blur (autosave)
  editor.addEventListener("blur", saveThisBlock);

  // Cmd/Ctrl+Enter saves quickly
  editor.addEventListener("keydown", (e) => {
    const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === "Enter";
    if (isCmdEnter) {
      e.preventDefault();
      saveThisBlock();
      editor.blur();
    }
  });

  prioritySelect.addEventListener("change", () => {
    pill.className = `priority priority-${prioritySelect.value}`;
    pill.textContent =
      prioritySelect.value === "high"
        ? "High"
        : prioritySelect.value === "medium"
        ? "Medium"
        : "Low";

    // persist immediately when changing priority
    saveThisBlock();
  });

  saveBtn.addEventListener("click", saveThisBlock);

  block.appendChild(time);
  block.appendChild(editor);
  block.appendChild(controls);
  block.appendChild(saveBtn);

  return block;
}

function renderSchedule() {
  // Keep nowLine as first element so it can overlay
  const nowLine = el.nowLine;
  el.schedule.innerHTML = "";
  el.schedule.appendChild(nowLine);

  for (let h = HOURS.start; h <= HOURS.end; h++) {
    el.schedule.appendChild(buildTimeBlock(h));
  }
}

/**
 * Now line + time class auditing
 */
function updateTimeClasses() {
  document.querySelectorAll(".timeblock").forEach((block) => {
    const hour = Number(block.dataset.hour);
    block.classList.remove("block-past", "block-present", "block-future");
    block.classList.add(blockTimeClass(hour));
  });
}

function updateNowLine() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Only show during schedule range
  if (currentHour < HOURS.start || currentHour > HOURS.end) {
    el.nowLine.style.transform = "translateY(-9999px)";
    return;
  }

  // Find the current block and position within it
  const block = document.querySelector(
    `.timeblock[data-hour="${currentHour}"]`
  );
  if (!block) return;

  const rect = block.getBoundingClientRect();
  const scheduleRect = el.schedule.getBoundingClientRect();

  // ratio within hour block: minutes / 60
  const ratio = currentMinutes / 60;
  const yWithinBlock = rect.height * ratio;

  // top within schedule container
  const y = rect.top - scheduleRect.top + yWithinBlock;

  el.nowLine.style.transform = `translateY(${Math.max(0, y)}px)`;
}

function scrollToCurrentHour() {
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour < HOURS.start) return;

  const targetHour = Math.min(Math.max(currentHour, HOURS.start), HOURS.end);
  const block = document.querySelector(`.timeblock[data-hour="${targetHour}"]`);
  if (!block) return;

  // scroll so current block is visible near top
  block.scrollIntoView({ block: "center", behavior: "smooth" });
}

/**
 * Clear day handler
 */
function onClearDay() {
  const ok = window.confirm("Clear all tasks for today?");
  if (!ok) return;

  clearTasks();
  renderSchedule();
  updateTimeClasses();
  updateNowLine();
  setStatus("Cleared.");
  showToast("Cleared");
}

/**
 * Init
 */
function init() {
  loadTheme();
  loadTasks();

  el.currentDay.textContent = formatHeaderDate();
  setStatus("");

  renderSchedule();
  updateTimeClasses();
  updateNowLine();

  // Auto-scroll to the current hour on load
  setTimeout(scrollToCurrentHour, 250);

  // Update time classes + now line every minute
  setInterval(() => {
    updateTimeClasses();
    updateNowLine();
  }, 60_000);

  el.clearDay.addEventListener("click", onClearDay);
  el.themeToggle.addEventListener("click", toggleTheme);
}

init();

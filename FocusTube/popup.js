import { initTheme } from './theme.js';
initTheme();            

function msToMin(ms) { return +(ms / 60000).toFixed(1); }

function isoWeek(d) {
  // parsing 'YYYY-MM-DD' creates a UTC date, which is correct for consistent week calculation
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getLocalDateKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function updateUI(raw) {
  const todayKey = getLocalDateKey();
  const todayMin = msToMin(raw[todayKey] || 0);
  document.getElementById("today").textContent = todayMin;

  const weekTotals = {};
  Object.entries(raw).forEach(([day, ms]) => {
    const w = isoWeek(new Date(day));
    weekTotals[w] = (weekTotals[w] || 0) + ms;
  });
  const avg =
    Object.values(weekTotals).reduce((a, b) => a + b, 0) /
    Math.max(Object.keys(weekTotals).length, 1);
  document.getElementById("weekly").textContent = msToMin(avg);
}

document.getElementById("openSettings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close(); 
});

chrome.storage.local.get({ watchTime: {} }, ({ watchTime }) => updateUI(watchTime));

const timerControls = document.getElementById("timer-controls");
const timerDisplay = document.getElementById("timer-display");
const startButton = document.getElementById("start-timer");
const countdownEl = document.getElementById("countdown");
const minutesInput = document.getElementById("timer-minutes");

let countdownInterval = null;

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function showCountdownUI(alarm) {
  if (countdownInterval) clearInterval(countdownInterval);

  timerControls.style.display = "none";
  timerDisplay.style.display = "block";

  const update = () => {
    const remainingMs = alarm.scheduledTime - Date.now();
    if (remainingMs > 0) {
      countdownEl.textContent = formatTime(remainingMs);
    } else {
      countdownEl.textContent = "00:00";
      clearInterval(countdownInterval);
    }
  };

  countdownInterval = setInterval(update, 500);
  update(); // run once immediately
}

function showControlsUI() {
  timerControls.style.display = "block";
  timerDisplay.style.display = "none";
  if (countdownInterval) clearInterval(countdownInterval);
}

chrome.alarms.get("youtube-timer", (alarm) => {
    if (alarm) {
        showCountdownUI(alarm);
    } else {
        showControlsUI();
    }
});

startButton.addEventListener("click", () => {
    const minutes = parseInt(minutesInput.value, 10);
    if (minutes && minutes > 0) {
        chrome.runtime.sendMessage({ command: "startTimer", duration: minutes }, () => {
            window.close();
        });
    }
});

window.addEventListener('unload', () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
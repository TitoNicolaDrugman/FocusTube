import { initTheme, saveTheme } from './theme.js';

function msToMin(ms) { return +(ms / 60000).toFixed(1); }

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${week.toString().padStart(2, '0')}`;
}

function formatRelativeTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `just now`;
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

function buildCharts(raw) {
  const dailyCtx = document.getElementById('dailyChart').getContext('2d');
  const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
  const days = Object.keys(raw).sort();
  const dayLabels = days.map(d => d.slice(5)); // “MM-DD”
  const dayData = days.map(d => msToMin(raw[d]));

  const weekAgg = {};
  days.forEach(d => {
    const w = isoWeek(new Date(d));
    weekAgg[w] = (weekAgg[w] || 0) + raw[d];
  });
  const weekLabels = Object.keys(weekAgg).sort();
  const weekData = weekLabels.map(w => msToMin(weekAgg[w]));

  // --- Chart Style Options for Dark Theme ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#abb2bf',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#abb2bf',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#abb2bf',
        },
      },
    },
  };

  new Chart(dailyCtx, {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [{
        label: 'minutes',
        data: dayData,
        backgroundColor: 'rgba(97, 175, 239, 0.6)',
        borderColor: 'rgba(97, 175, 239, 1)',
        borderWidth: 1,
      }]
    },
    options: chartOptions
  });

  new Chart(weeklyCtx, {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [{
        label: 'minutes',
        data: weekData,
        backgroundColor: 'rgba(97, 175, 239, 0.6)',
        borderColor: 'rgba(97, 175, 239, 1)',
        borderWidth: 1,
      }]
    },
    options: chartOptions
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  // theme control
  initTheme().then(current => {
    themeRadios.forEach(radio => {
      radio.checked = (radio.value === current);
    });
  });

  themeRadios.forEach(radio => {
    radio.addEventListener('change', () => saveTheme(radio.value));
  });

  const showCommentsCheckbox = document.getElementById('showComments');
  const grayscaleEnabledCheckbox = document.getElementById('grayscaleEnabled');
  const generalSettingsFieldset = document.getElementById('general-settings-fieldset');

  // lock elements
  const settingsLockOverlay = document.getElementById('settings-lock-overlay');
  const unlockSettingsButton = document.getElementById('unlock-settings-button');
  const unlockInstructions = document.getElementById('unlock-instructions');
  const unlockProgressContainer = document.getElementById('unlock-progress-container');
  const unlockProgressBar = document.getElementById('unlock-progress-bar');
  const cooldownSettingsFieldset = document.getElementById('cooldown-settings-fieldset');

  // focus hours elements
  const focusSettingsFieldset = document.getElementById('focus-settings-fieldset');
  const focusEnabledCheckbox = document.getElementById('focusEnabled');
  const focusControlsDiv = document.getElementById('focus-controls');
  const focusStartInput = document.getElementById('focusStart');
  const focusEndInput = document.getElementById('focusEnd');
  const focusDaysCheckboxes = document.querySelectorAll('#focus-days input[type="checkbox"]');
  const saveFocusButton = document.getElementById('saveFocus');
  const saveStatusP = document.getElementById('saveStatus');

  // colldown elements
  const cooldownDurationInput = document.getElementById('cooldownDuration');
  const cooldownClicksInput = document.getElementById('cooldownClicks');
  const saveCooldownButton = document.getElementById('saveCooldown');
  const cooldownSaveStatusP = document.getElementById('cooldownSaveStatus');

  // --- Default Settings ---
  const DEFAULT_FOCUS_SETTINGS = {
    enabled: false,
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5] // Mon-Fri
  };
  const DEFAULT_COOLDOWN_SETTINGS = {
    duration: 3, // minutes
    clicks: 30
  };

  let unlockTimer = null;
  let unlockStartTime = 0;
  const UNLOCK_DURATION = 60 * 1000; // 60 seconds

  function startUnlock(event) {
    event.preventDefault();

    if (unlockTimer) {
      clearInterval(unlockTimer);
    }
    
    unlockStartTime = Date.now();
    unlockProgressContainer.style.display = 'block';
    unlockSettingsButton.textContent = 'Unlocking... (Keep Holding)';
    unlockSettingsButton.classList.add('unlocking');
    unlockInstructions.textContent = 'Release or move mouse away to cancel.';
    unlockTimer = setInterval(updateUnlockProgress, 50);
  }

  function cancelUnlock() {
    if (unlockTimer) {
      clearInterval(unlockTimer);
      unlockTimer = null;
      unlockProgressBar.style.width = '0%';
      unlockProgressContainer.style.display = 'none';
      unlockSettingsButton.textContent = 'Unlock Settings';
      unlockSettingsButton.classList.remove('unlocking');
      unlockInstructions.innerHTML = 'To prevent impulsive changes, these settings are locked.<br>Click and hold the button below to unlock.';
    }
  }

  function updateUnlockProgress() {
    const elapsed = Date.now() - unlockStartTime;
    const progress = Math.min(elapsed / UNLOCK_DURATION, 1);
    unlockProgressBar.style.width = `${progress * 100}%`;

    if (progress >= 1) {
      clearInterval(unlockTimer);
      unlockTimer = null;
      unlockSettings();
    }
  }

  function unlockSettings() {
    settingsLockOverlay.style.display = 'none';
    generalSettingsFieldset.disabled = false;
    cooldownSettingsFieldset.disabled = false;
    focusSettingsFieldset.disabled = !focusEnabledCheckbox.checked;
  }
  
  // attach listeners for the lock
  unlockSettingsButton.addEventListener('mousedown', startUnlock);
  unlockSettingsButton.addEventListener('mouseup', cancelUnlock);
  unlockSettingsButton.addEventListener('mouseleave', cancelUnlock);
  unlockSettingsButton.addEventListener('touchstart', startUnlock, { passive: false });
  unlockSettingsButton.addEventListener('touchend', cancelUnlock);
  unlockSettingsButton.addEventListener('touchcancel', cancelUnlock);

  // functions to Save/Restore settings
  
  function showUnsavedFocusMessage() {
    saveStatusP.textContent = "Click 'Save Focus Settings' to apply changes.";
    saveStatusP.style.color = '#e5c07b'; 
    saveStatusP.style.opacity = 1;
  }
  
  function saveFocusSettings() {
    const days = Array.from(focusDaysCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.value, 10));

    const settings = {
      enabled: focusEnabledCheckbox.checked,
      start: focusStartInput.value,
      end: focusEndInput.value,
      days: days
    };

    chrome.storage.local.set({ focusSettings: settings }, () => {
      saveStatusP.style.color = 'var(--success-color)';
      saveStatusP.textContent = 'Settings saved!';
      saveStatusP.style.opacity = 1;
      setTimeout(() => { saveStatusP.style.opacity = 0; }, 2500);
    });
  }

  function restoreFocusSettings(settings) {
    const isEnabled = settings.enabled;
    focusEnabledCheckbox.checked = isEnabled;
    focusControlsDiv.style.display = isEnabled ? 'block' : 'none';
    
    if (settingsLockOverlay.style.display === 'none') {
        focusSettingsFieldset.disabled = !isEnabled;
    }
    
    focusStartInput.value = settings.start;
    focusEndInput.value = settings.end;

    focusDaysCheckboxes.forEach(cb => {
      cb.checked = settings.days.includes(parseInt(cb.value, 10));
    });
  }
  
  function showUnsavedCooldownMessage() {
    cooldownSaveStatusP.textContent = "Click 'Save Cooldown Settings' to apply changes.";
    cooldownSaveStatusP.style.color = '#e5c07b';
    cooldownSaveStatusP.style.opacity = 1;
  }

  function saveCooldownSettings() {
    const settings = {
      duration: parseInt(cooldownDurationInput.value, 10) || DEFAULT_COOLDOWN_SETTINGS.duration,
      clicks: parseInt(cooldownClicksInput.value, 10) || DEFAULT_COOLDOWN_SETTINGS.clicks,
    };
    chrome.storage.local.set({ cooldownSettings: settings }, () => {
        cooldownSaveStatusP.style.color = 'var(--success-color)';
        cooldownSaveStatusP.textContent = 'Settings saved!';
        cooldownSaveStatusP.style.opacity = 1;
        setTimeout(() => { cooldownSaveStatusP.style.opacity = 0; }, 2500);
    });
  }

  function restoreCooldownSettings(settings) {
      cooldownDurationInput.value = settings.duration;
      cooldownClicksInput.value = settings.clicks;
  }

  chrome.storage.local.get({
    watchTime: {},
    showComments: true,
    grayscaleEnabled: false,
    focusSettings: DEFAULT_FOCUS_SETTINGS,
    cooldownSettings: DEFAULT_COOLDOWN_SETTINGS,
    watchTimeLastUpdated: null,
  }, ({ watchTime, showComments, grayscaleEnabled, focusSettings, cooldownSettings, watchTimeLastUpdated }) => {
    showCommentsCheckbox.checked = showComments;
    grayscaleEnabledCheckbox.checked = grayscaleEnabled;
    buildCharts(watchTime);
    
    const formattedTime = formatRelativeTime(watchTimeLastUpdated);
    const dailyUpdatedEl = document.getElementById('daily-last-updated');
    const weeklyUpdatedEl = document.getElementById('weekly-last-updated');

    if (dailyUpdatedEl) dailyUpdatedEl.textContent = `Last updated: ${formattedTime}`;
    if (weeklyUpdatedEl) weeklyUpdatedEl.textContent = `Last updated: ${formattedTime}`;

    generalSettingsFieldset.disabled = true;
    focusSettingsFieldset.disabled = true;
    cooldownSettingsFieldset.disabled = true;
    restoreFocusSettings(focusSettings);
    restoreCooldownSettings(cooldownSettings);
  });

  // --- Event Listeners ---
  showCommentsCheckbox.addEventListener('change', e =>
    chrome.storage.local.set({ showComments: e.target.checked })
  );

  grayscaleEnabledCheckbox.addEventListener('change', e =>
    chrome.storage.local.set({ grayscaleEnabled: e.target.checked })
  );

  focusEnabledCheckbox.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    focusControlsDiv.style.display = isEnabled ? 'block' : 'none';
    if (settingsLockOverlay.style.display === 'none') {
        focusSettingsFieldset.disabled = !isEnabled;
    }
    showUnsavedFocusMessage();
  });
  
  [focusStartInput, focusEndInput].forEach(input => {
    input.addEventListener('input', showUnsavedFocusMessage);
  });
  focusDaysCheckboxes.forEach(cb => {
    cb.addEventListener('change', showUnsavedFocusMessage);
  });
  saveFocusButton.addEventListener('click', saveFocusSettings);
  
  cooldownDurationInput.addEventListener('input', showUnsavedCooldownMessage);
  cooldownClicksInput.addEventListener('input', showUnsavedCooldownMessage);
  saveCooldownButton.addEventListener('click', saveCooldownSettings);

  // --- ADD Version Info ---
  const versionInfoEl = document.getElementById('version-info');
  if (versionInfoEl) {
    const manifest = chrome.runtime.getManifest();
    const lastUpdatedDate = 'October 22, 2025';
    versionInfoEl.textContent = `Version ${manifest.version} — Last updated: ${lastUpdatedDate}.`;
  }
});
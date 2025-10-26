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

// --- Helper Function to Check and Block YouTube ---
// This function handles both Focus Mode and the post-timer Cooldown Mode.
function checkAndBlock(tabId, tabUrl) {
  chrome.storage.local.get(
    { 
      focusSettings: DEFAULT_FOCUS_SETTINGS, 
      cooldownSettings: DEFAULT_COOLDOWN_SETTINGS,
      cooldownUntil: null 
    }, 
    ({ focusSettings, cooldownSettings, cooldownUntil }) => {
    if (focusSettings.enabled && focusSettings.start && focusSettings.end && focusSettings.days && focusSettings.days.length > 0) {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = sunday, 1=monday, ...
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      const isFocusDay = focusSettings.days.includes(currentDay);
      const isFocusTime = focusSettings.start < focusSettings.end
        ? (currentTime >= focusSettings.start && currentTime < focusSettings.end)
        : (currentTime >= focusSettings.start || currentTime < focusSettings.end);

      if (isFocusDay && isFocusTime) {
        // in focus mode, just close the tab
        chrome.tabs.remove(tabId);
        return; 
      }
    }
    
    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) {
      chrome.storage.session.get(['passedChallengeTabs'], ({ passedChallengeTabs }) => {
         const passed = passedChallengeTabs || [];
         if (!passed.includes(tabId)) {
            chrome.tabs.sendMessage(tabId, { 
              command: 'showCooldownChallenge',
              clicks: cooldownSettings.clicks || 30
            });
         }
      });
      return; 
    } else if (cooldownUntil && now >= cooldownUntil) {
      chrome.storage.local.remove('cooldownUntil');
    }
  });
}


chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'youtube-timer') {
    chrome.storage.local.get({ cooldownSettings: DEFAULT_COOLDOWN_SETTINGS }, ({ cooldownSettings }) => {
        const cooldownDurationMs = (cooldownSettings.duration || 3) * 60 * 1000;
        
        const cooldownEndTime = Date.now() + cooldownDurationMs;
        chrome.storage.local.set({ cooldownUntil: cooldownEndTime }, () => {
            chrome.tabs.query({ url: 'https://www.youtube.com/*' }, (tabs) => {
              if (tabs && tabs.length > 0) {
                chrome.tabs.remove(tabs.map(tab => tab.id));
              }
            });
        });
        chrome.alarms.clear('youtube-timer');
    });

  } else if (alarm.name === 'focus-checker') {
    chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
      tabs.forEach(tab => {
        checkAndBlock(tab.id, tab.url);
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'startTimer' && request.duration > 0) {
    chrome.alarms.create('youtube-timer', {
      delayInMinutes: request.duration,
    });
    sendResponse({ success: true });
  } else if (request.command === 'cooldownChallengePassed') {
    chrome.storage.session.get(['passedChallengeTabs'], ({ passedChallengeTabs }) => {
        const passed = passedChallengeTabs || [];
        if (sender.tab && sender.tab.id && !passed.includes(sender.tab.id)) {
            passed.push(sender.tab.id);
            chrome.storage.session.set({ passedChallengeTabs: passed });
        }
    });
    sendResponse({ success: true });
  } else if (request.command === 'addWatchTime') {
    if (request.ms > 0) {
        const dayKey = ((d) => {
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        })(new Date());

        chrome.storage.local.get({ watchTime: {} }, ({ watchTime }) => {
            watchTime[dayKey] = (watchTime[dayKey] || 0) + request.ms;
            const lastUpdated = new Date().toISOString();
            chrome.storage.local.set({ watchTime, watchTimeLastUpdated: lastUpdated });
        });
    }
  } else if (request.command === 'getSettings') {
    chrome.storage.local.get({
        showComments: true,
        grayscaleEnabled: false
    }, (settings) => {
        sendResponse(settings);
    });
    return true; // required for async sendResponse
  }
  return true; //indicate async response
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes("youtube.com") && changeInfo.status === 'complete') {
    checkAndBlock(tabId, tab.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.session.get(['passedChallengeTabs'], ({ passedChallengeTabs }) => {
        if (!passedChallengeTabs) return;
        const newPassed = passedChallengeTabs.filter(id => id !== tabId);
        if (newPassed.length !== passedChallengeTabs.length) {
            chrome.storage.session.set({ passedChallengeTabs: newPassed });
        }
    });
});


chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        const changedSettings = {};
        if (changes.showComments) {
            changedSettings.showComments = changes.showComments.newValue;
        }
        if (changes.grayscaleEnabled) {
            changedSettings.grayscaleEnabled = changes.grayscaleEnabled.newValue;
        }

        const keysToUpdate = Object.keys(changedSettings);
        if (keysToUpdate.length > 0) {
            // all YouTube tabs
            chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    keysToUpdate.forEach(key => {
                        chrome.tabs.sendMessage(tab.id, {
                            command: 'updateSetting',
                            setting: key,
                            value: changedSettings[key]
                        }).catch(err => { /* Suppress errors from tabs that can't be reached */ });
                    });
                });
            });
        }
    }
});


chrome.alarms.create('focus-checker', {
    delayInMinutes: 1, // TODO: need to improve this
    periodInMinutes: 1 // TODO: need to improve this
});

chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
  tabs.forEach(tab => {
    checkAndBlock(tab.id, tab.url);
  });
});
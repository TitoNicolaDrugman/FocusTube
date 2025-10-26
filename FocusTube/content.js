// FocusTube v0.4 – hides distractions, blocks Shorts, and removes watch-page suggestions
// -----------------------------------------------------------------------------
// Changelog v0.4
// • NEW: Removes “Up next” / suggested-video side rail on regular watch pages.
// -----------------------------------------------------------------------------

/********************
 * Config Selectors *
 *******************/
const HIDE_SELECTORS = [
  // Navigation / chrome
  '#guide-button',                           // masthead hamburger / guide toggle
  'tp-yt-paper-icon-button[aria-label="Guide"]', // fallback for newer markup
  '#appbar-guide-button',                    // legacy fallback

  'ytd-mini-guide-renderer',                // left navigation
  'ytd-guide-renderer',                     // guide (expanded)
  '#guide',                                 // guide fallback
  

  // Home & global promos
  'ytd-feed-filter-chip-bar-renderer',      // filter chips (home)
  'ytd-chip-cloud-renderer',                // homepage categories chips
  'yt-chip-cloud-renderer',
  'ytd-chips-bar-renderer',
  '#chips-wrapper',                         // wrapper for categories
  'div#frosted-glass.with-chipbar',         // frosted-glass bar

  // Shorts shelves (appear on many surfaces, inc. search)
  'ytd-reel-shelf-renderer',

  // In-video / player distractions
  '.ytp-endscreen-content',                 // End-of-video suggestion grid
  '.ytp-pause-overlay-container',           // "More videos" overlay on pause
  '.ytp-next-button',                       // Next video button in control bar
  '.ytp-autonav-toggle-button-container',   // Autoplay toggle in settings menu
];

const HOME_VIDEO_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-rich-grid-renderer',
  'ytd-rich-grid-row-renderer',
];

const WATCH_SUGGESTION_SELECTORS = [
  '#secondary',                             // full side rail (desktop)
  '#related',                               // related feed (old markup / mobile)
  'ytd-watch-next-secondary-results-renderer',
  'ytd-watch-next-feed',
  'ytd-compact-video-renderer',             // individual suggestion tiles
  'ytd-compact-radio-renderer',
];

/*********************
 * Helper Functions  *
 *********************/
function qsAll(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function hide(el) {
  if (el && el.style.display !== 'none') {
    el.style.display = 'none';
  }
}


let playingSince = null;
let flushInterval = null;

function addMsToStore(ms) {
  if (ms <= 0) return;
  
  try {
    chrome.runtime.sendMessage({ command: 'addWatchTime', ms: ms }, () => {
      if (chrome.runtime.lastError) {
        if (flushInterval) clearInterval(flushInterval);
        flushInterval = null;
        playingSince = null;
      }
    });
  } catch (error) {
    if (flushInterval) clearInterval(flushInterval);
    flushInterval = null;
    playingSince = null;
  }
}

function flushProgress() {
  if (!playingSince) return;
  const now = Date.now();
  const ms = now - playingSince;
  addMsToStore(ms);
  playingSince = now; 
}

function stopTimer() {
  if (!playingSince) return;
  
  const now = Date.now();
  const ms = now - playingSince;
  addMsToStore(ms);
  
  playingSince = null;
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

function hookVideo(v) {
  if (v.__ctHooked) return;
  v.__ctHooked = true;
  
  v.addEventListener('play', () => {
    if (!playingSince) {
      playingSince = Date.now();
    }
    if (!flushInterval) {
      flushInterval = setInterval(flushProgress, 15_000);
    }
  }, true);

  v.addEventListener('pause', stopTimer, true);
  v.addEventListener('ended', stopTimer, true);
}

qsAll('video').forEach(hookVideo);
new MutationObserver(() => qsAll('video').forEach(hookVideo))
  .observe(document, { childList: true, subtree: true });

window.addEventListener('beforeunload', stopTimer);
window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopTimer();
    } else {
        const videoElement = qsAll('video').find(v => !v.paused);
        if (videoElement && !playingSince) {
            playingSince = Date.now();
            if (!flushInterval) {
                flushInterval = setInterval(flushProgress, 15_000);
            }
        }
    }
});

/***************************
 * General Settings Appliers
 ***************************/
const GRAYSCALE_STYLE_ID = 'ct-grayscale-style';

function applyGrayscale(enabled) {
  let styleEl = document.getElementById(GRAYSCALE_STYLE_ID);
  if (enabled) {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = GRAYSCALE_STYLE_ID;
    styleEl.textContent = 'html { filter: grayscale(1) !important; }';
    document.head.appendChild(styleEl);
  } else {
    if (styleEl) {
      styleEl.remove();
    }
  }
}

function applyCommentPref(show) {
  qsAll('#comments, ytd-comments').forEach(el => {
    el.style.display = show ? '' : 'none'
  });
}

function applyInitialSettings() {
    chrome.runtime.sendMessage({ command: 'getSettings' }, (settings) => {
        if (chrome.runtime.lastError) {
            return;
        }
        if (settings) {
            applyCommentPref(settings.showComments);
            applyGrayscale(settings.grayscaleEnabled);
        }
    });
}
applyInitialSettings();


/***************************
 * Core hiding functionality
 ***************************/
function hideDistractingElements() {
  HIDE_SELECTORS.forEach(sel => qsAll(sel).forEach(hide));
}

const CATCHPHRASE_ID = 'ct-catchphrase';

function hideHomeVideos() {
  const isHome = window.location.pathname === '/';
  const existingMessage = document.getElementById(CATCHPHRASE_ID);
  const searchInput = document.querySelector('input#search');

  if (isHome) {
    document.body.style.backgroundColor = 'black';
    HOME_VIDEO_SELECTORS.forEach(sel => qsAll(sel).forEach(hide));
    
    let message;
    if (!existingMessage) {
      message = document.createElement('div');
      message.id = CATCHPHRASE_ID;
      message.innerHTML = `
        Search for what you need to watch.<br>Don't be guided by the algorithm.
        <br><br>
        <small style="font-size: 15px; font-weight: normal; color: #888;">
          Click the extension icon for settings, to start a Session Timer, and to monitor time spent on YouTube.
        </small>
      `;
      Object.assign(message.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#b0b0b0',
        fontSize: '28px',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        lineHeight: '1.5em',
        zIndex: 9998,
        pointerEvents: 'none', // prevents the message from blocking clicks
        transition: 'opacity 0.2s ease-in-out',
      });
      document.documentElement.appendChild(message);
    } else {
      message = existingMessage;
    }

    if (searchInput && !searchInput.__ctListenerAttached) {
      searchInput.__ctListenerAttached = true; 
      
      const hideMessage = () => {
        if (message) message.style.opacity = '0';
      };
      
      const showMessage = () => {
        if (message && !searchInput.value) {
          message.style.opacity = '1';
        }
      };

      searchInput.addEventListener('focus', hideMessage);
      searchInput.addEventListener('blur', showMessage);
    }

  } else if (existingMessage) {
    // If we navigate away from home, remove the message
    existingMessage.remove();
  }
}

/********************************************************
 * Strip Shorts from search-results (/results)          *
 ********************************************************/
function hideSearchShorts() {
  if (window.location.pathname === '/results') {
    qsAll('ytd-reel-shelf-renderer').forEach(hide);

    const shortAnchors = qsAll('a#thumbnail[href*="/shorts/"], a#video-title[href*="/shorts/"]');
    shortAnchors.forEach(a => {
      const container = a.closest(
        'ytd-video-renderer, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer'
      );
      hide(container || a);
    });
  }
}

/********************************************************
 * Remove suggested videos from watch pages (/watch)     *
 ********************************************************/
function hideWatchSuggestions() {
  if (window.location.pathname === '/watch') {
    WATCH_SUGGESTION_SELECTORS.forEach(sel => qsAll(sel).forEach(hide));
  }
}

/********************************************************
 * Block the Shorts watch page (/shorts/…)              *
 ********************************************************/
const BLOCKER_ID = 'ct-short-blocker';

function renderShortsBlocker() {
  if (document.getElementById(BLOCKER_ID)) return; // already present

  const blocker = document.createElement('div');
  blocker.id = BLOCKER_ID;
  blocker.textContent = 'Shorts are blocked';

  Object.assign(blocker.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '24px 32px',
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'black',
    borderRadius: '12px',
    zIndex: 9999,
    textAlign: 'center',
  });

  document.documentElement.appendChild(blocker);
}

function removeShortsBlocker() {
  const blocker = document.getElementById(BLOCKER_ID);
  if (blocker) blocker.remove();
}

function blockShortsPage() {
  const isShort = window.location.pathname.startsWith('/shorts');

  if (isShort) {
    qsAll('video').forEach(v => {
      v.pause();
      v.muted = true;
    });

    qsAll('#shorts-container, ytd-reel-video-renderer, ytd-player, #player-container, #container').forEach(hide);

    renderShortsBlocker();
  } else {
    removeShortsBlocker();
  }
}

/*****************************
 * Bootstrap & observers      *
 *****************************/
function runAll() {
  hideDistractingElements();
  hideHomeVideos();
  hideSearchShorts();
  hideWatchSuggestions();
  blockShortsPage();
}

runAll();

const observer = new MutationObserver(runAll);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('yt-navigate-finish', runAll);

/********************************************************
 * Cooldown Challenge after Session Timer
 ********************************************************/
const COOLDOWN_CHALLENGE_ID = 'ct-cooldown-challenge';
let clicksRequired = 30; 
let clickCount = 0;

function removeCooldownChallenge() {
    const challengeElement = document.getElementById(COOLDOWN_CHALLENGE_ID);
    if (challengeElement) {
        challengeElement.remove();
    }
    document.documentElement.style.visibility = 'visible';
}

function moveYesButton(button) {
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = button;

    const newTop = Math.random() * (innerHeight - offsetHeight);
    const newLeft = Math.random() * (innerWidth - offsetWidth);

    button.style.top = `${newTop}px`;
    button.style.left = `${newLeft}px`;
    button.textContent = `Yes (${clicksRequired - clickCount})`;
}

function handleYesClick(event) {
    clickCount++;
    if (clickCount >= clicksRequired) {
        removeCooldownChallenge();
        chrome.runtime.sendMessage({ command: 'cooldownChallengePassed' });
    } else {
        moveYesButton(event.target);
    }
}

function showCooldownChallenge(requiredClicks) {
    clicksRequired = requiredClicks || 30;

    document.documentElement.style.visibility = 'hidden';

    if (document.getElementById(COOLDOWN_CHALLENGE_ID)) {
        document.documentElement.style.visibility = 'visible';
        return;
    }

    clickCount = 0; 

    const overlay = document.createElement('div');
    overlay.id = COOLDOWN_CHALLENGE_ID;
    
    overlay.innerHTML = `
        <div class="ct-cooldown-message">
            <h2>Are you sure?</h2>
            <p>Your session timer just expired. Take a break.</p>
            <p>If you must continue, prove your intent by clicking the button ${clicksRequired} times.</p>
        </div>
        <button class="ct-cooldown-yes-button">Yes (${clicksRequired})</button>
    `;

    document.documentElement.appendChild(overlay);

    const yesButton = overlay.querySelector('.ct-cooldown-yes-button');
    yesButton.addEventListener('click', handleYesClick);

    const style = document.createElement('style');
    style.textContent = `
      #${COOLDOWN_CHALLENGE_ID} {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        background-color: rgba(0, 0, 0, 0.95);
        z-index: 2147483647; /* Max z-index */
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        visibility: hidden; /* Hide until button is positioned */
      }
      .ct-cooldown-message {
        color: #e0e0e0;
        text-align: center;
        font-family: system-ui, sans-serif;
      }
      .ct-cooldown-message h2 { font-size: 48px; margin: 0 0 1rem; }
      .ct-cooldown-message p { font-size: 20px; margin: 0.5rem 0; max-width: 600px; }
      .ct-cooldown-yes-button {
        position: absolute;
        padding: 15px 25px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        border: 2px solid #61afef;
        background-color: #3a4049;
        color: #e0e6f0;
        border-radius: 8px;
        transition: transform 0.1s ease, background-color 0.2s;
      }
      .ct-cooldown-yes-button:hover { background-color: #4b525e; }
      .ct-cooldown-yes-button:active { transform: scale(0.95); }
    `;
    overlay.appendChild(style);
    
    requestAnimationFrame(() => {
        moveYesButton(yesButton);
        document.documentElement.style.visibility = 'visible';
        overlay.style.visibility = 'visible';
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === 'showCooldownChallenge') {
        showCooldownChallenge(request.clicks); 
        sendResponse({ success: true });
    } else if (request.command === 'updateSetting') {
        if (request.setting === 'showComments') {
            applyCommentPref(request.value);
        } else if (request.setting === 'grayscaleEnabled') {
            applyGrayscale(request.value);
        }
        sendResponse({ success: true });
    }
    return true; 
});
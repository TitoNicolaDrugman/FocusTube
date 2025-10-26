const THEMES = {
  dark:  {
    '--bg-color': '#282c34',
    '--secondary-bg': '#3a4049',
    '--border-color': '#4a505c',
    '--text-color': '#abb2bf',
    '--header-color': '#e0e6f0',
    '--accent-color': '#61afef',
    '--accent-color-hover': '#529bdf',
    '--success-color': '#98c379',
    '--val-color': '#98c379'
  },
  light: {
    '--bg-color': '#ffffff',
    '--secondary-bg': '#f0f2f5',
    '--border-color': '#d7dce2',
    '--text-color': '#2b2b2e',
    '--header-color': '#000000',
    '--accent-color': '#006edc',
    '--accent-color-hover': '#0054ad',
    '--success-color': '#2ea043',
    '--val-color': '#2ea043'
  },

  dracula: {
    '--bg-color':       '#282a36',
    '--secondary-bg':   '#44475a',
    '--border-color':   '#6272a4',
    '--text-color':     '#f8f8f2',
    '--header-color':   '#f8f8f2',
    '--accent-color':   '#ff79c6',
    '--accent-color-hover': '#ff92df',
    '--success-color':  '#50fa7b',
    '--val-color':      '#bd93f9'
  }
};

function applyTheme(name = 'dark') {
  const vars = THEMES[name] || THEMES.dark;
  Object.entries(vars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v)
  );
}

export async function initTheme () {
  const { theme = 'dark' } = await chrome.storage.local.get('theme');
  applyTheme(theme);
  return theme;                
}

export async function saveTheme (name) {
  await chrome.storage.local.set({ theme: name });
  applyTheme(name);
}

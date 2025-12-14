import "../lib/dygraph.js";

export {themes};

window.currentTheme = 'gold'

const themes = {
  green: {
    '--color-primary': '#128629',
    '--color-primary-variant': '#2ea93f',
    '--color-secondary': '#84c750',
    '--color-secondary-variant': '#9bd171',
    '--color-background': '#5ac465',
    '--color-surface': '#d4ebc2',
    '--color-surface-odd': '#eef7e6',
    '--color-error': '#128629',

    '--on-primary': '#e7f6e9',
    '--on-secondary': '#006400',
    '--on-background': '#006713',
    '--on-surface': '#006400',
    '--on-error': '#F2E8CF',
  },
  blue: {
    '--color-primary': '#6200EE',
    '--color-primary-variant': '#3700B3',
    '--color-secondary': '#03DAC6',
    '--color-secondary-variant': '#018786',
    '--color-background': '#FFFFFF',
    '--color-surface': '#D6D6D6',
    '--color-surface-odd': '#CCCCCC',
    '--color-error': '#B00020',
    '--on-primary': '#FFFFFF',
    '--on-secondary': '#000000',
    '--on-background': '#000000',
    '--on-surface': '#000000',
    '--on-error': '#FFFFFF',
  },
  gold: {
    '--color-primary':' #db3a34',
    '--color-primary-variant':' #ad201c',
    '--color-secondary':' #e4a547',
    '--color-secondary-variant':' #eec98c',
    '--color-background':' #e3e673',
    '--color-surface':' #f3f4c2',
    '--color-surface-odd':' #fafbe7',
    '--color-error':' #ad201c',

    '--on-primary':' #fafbe7',
    '--on-secondary':' #ad201c',
    '--on-background':' #877614',
    '--on-surface':' #ad201c',
    '--on-error':' #ebfce9',
  },
  dark: {
  /* Primary Colors - Softer red with better contrast */
  '--color-primary': '#ff6b6b',
  '--color-primary-variant': '#e85a5a', 
  '--color-secondary': '#ffd93d',
  '--color-secondary-variant': '#ffed4e',
  
  /* Background Colors - Rich dark grays */
  '--color-background': '#1a1d23',
  '--color-surface': '#242831',
  '--color-surface-odd': '#2a2f3a',
  
  /* Additional surface variations for depth */
  '--color-surface-elevated': '#2f3441',
  '--color-surface-header': '#1e2129',
  '--color-surface-sidebar': '#20252e',
  
  /* Error state */
  '--color-error': '#ff5252',
  
  /* Text colors on backgrounds */
  '--on-primary': '#ffffff',
  '--on-secondary': '#1a1d23',
  '--on-background': '#e4e6ea',
  '--on-surface': '#d1d5db',
  '--on-error': '#ffffff',
  
  /* Additional semantic colors */
  '--color-success': '#4ade80',
  '--color-warning': '#fbbf24',
  '--color-info': '#60a5fa',
  
  /* Border and divider colors */
  '--color-border': '#374151',
  '--color-border-light': '#4b5563',
  '--color-divider': '#374151',
  
  /* Interactive states */
  '--color-hover': 'rgba(255, 255, 255, 0.08)',
  '--color-active': 'rgba(255, 255, 255, 0.12)',
  '--color-focus': 'rgba(255, 107, 107, 0.3)',
  '--color-disabled': '#6b7280',
  
  /* Chart and data visualization colors */
  '--color-chart-primary': '#ff6b6b',
  '--color-chart-secondary': '#ffd93d',
  '--color-chart-accent-1': '#60a5fa',
  '--color-chart-accent-2': '#34d399',
  '--color-chart-accent-3': '#f472b6',
  '--color-chart-grid': '#374151',
  '--color-chart-text': '#9ca3af',
  
  /* Shadow and elevation */
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
  '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.4)',
  '--shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
  
  /* Typography weights for hierarchy */
  '--text-primary': '#f9fafb',
  '--text-secondary': '#d1d5db',
  '--text-tertiary': '#9ca3af',
  '--text-disabled': '#6b7280',
  }
};

//apply a theme to the document
function applyTheme(theme) {
    window.currentTheme = theme
    const root = document.documentElement;
    const colors = themes[theme];
    for (let key in colors) {
        root.style.setProperty(key, colors[key]);
    }
    window.h.updateOptions({color: themes[theme]['--color-primary']})
}

document.getElementById("themeGreen").addEventListener("click", function() {applyTheme("dark")})
document.getElementById("themeBlue").addEventListener("click", function() {applyTheme("blue")})
document.getElementById("themeGold").addEventListener("click", function() {applyTheme("gold")})

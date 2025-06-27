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

document.getElementById("themeGreen").addEventListener("click", function() {applyTheme("green")})
document.getElementById("themeBlue").addEventListener("click", function() {applyTheme("blue")})
document.getElementById("themeGold").addEventListener("click", function() {applyTheme("gold")})

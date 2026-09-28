export {themes};

window.currentTheme = 'gold'

const themes = {
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

    '--toggle-off': '#ad201c',
    '--on-toggle-off': '#eec98c',
    '--graph-ink': '#000000',
    'color-scheme': 'light',
  },
  slate: {
    '--color-primary': '#5b7fb3',
    '--color-primary-variant': '#3f5f8f',
    '--color-secondary': '#343a40',
    '--color-secondary-variant': '#454d55',
    '--color-background': '#121417',
    '--color-surface': '#1c1f23',
    '--color-surface-odd': '#2c3238',
    '--color-error': '#e5484d',

    '--on-primary': '#ffffff',
    '--on-secondary': '#e9ecef',
    '--on-background': '#8b949e',
    '--on-surface': '#dee2e6',
    '--on-error': '#ffffff',

    '--toggle-off': '#25292e',
    '--on-toggle-off': '#8b949e',
    '--graph-ink': '#ced4da',
    'color-scheme': 'dark',
  },
  retro: {
    '--color-primary': '#264653',
    '--color-primary-variant': '#1a323b',
    '--color-secondary': '#f4a261',
    '--color-secondary-variant': '#f6c89f',
    '--color-background': '#6fb8ad',
    '--color-surface': '#f7eedc',
    '--color-surface-odd': '#e9d9bb',
    '--color-error': '#e76f51',

    '--on-primary': '#f7eedc',
    '--on-secondary': '#264653',
    '--on-background': '#1a323b',
    '--on-surface': '#264653',
    '--on-error': '#ffffff',

    '--toggle-off': '#264653',
    '--on-toggle-off': '#f6c89f',
    '--graph-ink': '#000000',
    'color-scheme': 'light',
  },
}

//apply a theme to the document
function applyTheme(theme) {
    window.currentTheme = theme
    const root = document.documentElement;
    const colors = themes[theme];
    for (let key in colors) {
        root.style.setProperty(key, colors[key]);
    }
    window.dispatchEvent(new Event("themechange"))
}

//one radio button per theme
for (const name in themes) {
    const input = document.createElement("input");
    input.type = "radio";
    input.id = "theme" + name;
    input.name = "themeSelector";
    input.checked = name == window.currentTheme;
    input.addEventListener("click", function() {applyTheme(name)})
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = name[0].toUpperCase() + name.slice(1);
    themeRadio.append(input, label);
}

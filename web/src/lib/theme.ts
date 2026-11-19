// paper: a warm light theme after the Minimal theme in my Obsidian vault
export type Theme = 'system' | 'light' | 'dark' | 'paper'

// the same key and rule as the inline script in index.html, which applies it before the first paint
export const KEY = 'theme'
const systemDark = () => matchMedia('(prefers-color-scheme: dark)')

export function storedTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' || t === 'paper' ? t : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(t: Theme) {
  const root = document.documentElement.classList
  root.toggle('dark', t === 'dark' || (t === 'system' && systemDark().matches))
  root.toggle('paper', t === 'paper')
}

// follow the system while the choice is System
systemDark().addEventListener('change', () => applyTheme(storedTheme()))

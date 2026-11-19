import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { applyTheme, KEY, storedTheme, type Theme } from '../lib/theme'

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(storedTheme)
  function pick(t: Theme) {
    setTheme(t)
    try {
      if (t === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, t)
    } catch {
      // private mode: the choice lasts until reload
    }
    applyTheme(t)
  }
  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={value === theme}
          aria-label={`${label} theme`}
          title={label}
          onClick={() => pick(value)}
          className={`inline-flex items-center rounded-md p-1.5 ${
            value === theme
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Icon />
        </button>
      ))}
    </div>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'datatrop_admin_theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'dark' || stored === 'light' ? stored : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

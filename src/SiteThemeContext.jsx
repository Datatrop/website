import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Public-site light / dark mode. Dark (the grape / maroon brand look) is the
// default; a visitor's choice is remembered in localStorage. The inline script
// in index.html applies a saved choice before the app boots so the page never
// flashes the wrong theme. The `dark` class stays on <html> either way: the
// light theme is layered on top with `site-light` (see index.css).
const SiteThemeContext = createContext(null)

const SITE_THEME_KEY = 'datatrop_site_theme'
const THEME_COLOR = { dark: '#1B050D', light: '#FBF7FA' }

const storedTheme = () => {
  try {
    return localStorage.getItem(SITE_THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function SiteThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => (typeof window === 'undefined' ? 'dark' : storedTheme()))

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dark')
    root.classList.toggle('site-light', theme === 'light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
    // Leaving the public site (e.g. for the admin panel) drops the light layer
    return () => root.classList.remove('site-light')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(SITE_THEME_KEY, next) } catch { /* storage blocked: choice lasts this page view */ }
      return next
    })
  }, [])

  return (
    <SiteThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </SiteThemeContext.Provider>
  )
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext)
  if (!ctx) {
    throw new Error('useSiteTheme must be used within a SiteThemeProvider')
  }
  return ctx
}

// Sun / moon switch used in the site header
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useSiteTheme()
  const toLight = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={toLight ? 'Switch to light mode' : 'Switch to dark mode'}
      title={toLight ? 'Light mode' : 'Dark mode'}
      className={`w-10 h-10 rounded-full border border-white/15 text-white/75 hover:text-white hover:border-[rgb(var(--accent)_/_0.6)] flex items-center justify-center transition-colors ${className}`}
    >
      {toLight ? (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
          <path d="M20.5 14.6A8.5 8.5 0 019.4 3.5 8.5 8.5 0 1020.5 14.6z" />
        </svg>
      )}
    </button>
  )
}

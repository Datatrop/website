import { createContext, useContext, useEffect } from 'react'

// The public site is dark-only (grape / maroon brand palette). The provider
// keeps the `dark` class on <html> so the page background and any shared
// `dark:` styles match, and is kept as a context so a toggle can return later.
const SiteThemeContext = createContext(null)

export function SiteThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <SiteThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useTheme } from './ThemeContext.jsx'

const ALLOWED_EMAIL = 'support@datatrop.in'

const _logoMods = import.meta.glob('../assets/datatrop-logo-transparent.png', { eager: true })
const logoSrc = _logoMods['../assets/datatrop-logo-transparent.png']?.default ?? null
const _logoModsWhite = import.meta.glob('../assets/logo.png', { eager: true })
const logoSrcWhite = _logoModsWhite['../assets/logo.png']?.default ?? null

export default function AdminLogin() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.me()
      .then(() => navigate('/admin/dashboard', { replace: true }))
      .catch(() => {})
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      setError('Access denied. Unauthorized account.')
      return
    }
    setLoading(true)
    try {
      await api.login(email.trim(), password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp =
    'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--brand)_/_0.12)] transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#FAF5F8] to-[#F1E6EE] dark:!bg-none dark:!bg-[#070305] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-brand-gradient pointer-events-none hidden dark:block" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            theme === 'dark'
              ? 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(138,42,145,0.22) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 60% 50% at 50% 50%, rgb(var(--brand) / 0.08) 0%, transparent 70%)',
        }}
      />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-slate-500 dark:text-gray-500 hover:text-[#1B050D] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
      >
        {theme === 'dark' ? (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          {logoSrc ? (
            <>
              <img src={logoSrc} alt="Datatrop" className="h-10 w-auto object-contain dark:hidden" />
              <img src={logoSrcWhite ?? logoSrc} alt="Datatrop" className="h-10 w-auto object-contain hidden dark:block" />
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[rgb(var(--brand))] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-[#1B050D] dark:text-white font-bold text-xl tracking-tight">Datatrop</span>
            </div>
          )}
          <p className="text-slate-500 dark:text-gray-600 text-xs mt-3 font-medium uppercase tracking-widest">
            Admin Panel
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] shadow-lg dark:shadow-none">
          <h1 className="text-[#1B050D] dark:text-white font-bold text-xl mb-6">Sign In</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="support@datatrop.in"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inp}
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[rgb(var(--brand))] dark:hover:bg-rose-soft text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-1"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 dark:text-gray-700 text-xs mt-6">
          <a href="/" className="hover:text-[rgb(var(--brand))] dark:hover:text-gray-500 transition-colors">← Back to website</a>
        </p>
      </div>
    </div>
  )
}

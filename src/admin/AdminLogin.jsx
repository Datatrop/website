import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useTheme } from './ThemeContext.jsx'

const ALLOWED_EMAIL = 'support@datatrop.in'

import Logo from '../Logo.jsx'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          <Logo className="h-10 w-auto text-[#1B050D] dark:text-white" title="Datatrop" />
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inp} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.2A9.8 9.8 0 0112 4c5 0 9 4.5 10 8-.4 1.3-1.2 2.7-2.3 4M6.2 6.2C4.3 7.5 2.8 9.6 2 12c1 3.5 5 8 10 8 1.8 0 3.4-.5 4.8-1.3" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1-3.5 5-8 10-8s9 4.5 10 8c-1 3.5-5 8-10 8S3 15.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
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

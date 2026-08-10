import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

const ALLOWED_EMAIL = 'support@datatrop.in'

const _logoMods = import.meta.glob('../assets/logo.png', { eager: true })
const logoSrc = _logoMods['../assets/logo.png']?.default ?? null

export default function AdminLogin() {
  const navigate = useNavigate()
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
    'w-full px-4 py-3 rounded-xl bg-[#0c0c0c] border border-[#222] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/[0.12] transition-colors'

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 hero-grid pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(59,130,246,0.045) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          {logoSrc ? (
            <img src={logoSrc} alt="Datatrop" className="h-14 w-auto object-contain" />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Datatrop</span>
            </div>
          )}
          <p className="text-gray-600 text-xs mt-3 font-medium uppercase tracking-widest">
            Admin Panel
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-2xl border border-[#1a1a1a] bg-[#090909]">
          <h1 className="text-white font-bold text-xl mb-6">Sign In</h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
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
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
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
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 btn-cyan-glow mt-1"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          <a href="/" className="hover:text-gray-500 transition-colors">← Back to website</a>
        </p>
      </div>
    </div>
  )
}

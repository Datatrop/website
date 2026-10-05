import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useTheme } from './ThemeContext.jsx'

import Logo from '../Logo.jsx'

const navItems = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: (
      <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Deals',
    path: '/admin/deals',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7h-3V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2H4a1 1 0 00-1 1v3c0 1.1.9 2 2 2h14a2 2 0 002-2V8a1 1 0 00-1-1zM9 5h6v2H9V5zm12 8.5V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-5.5a4 4 0 002 .5h14a4 4 0 002-.5z" />
      </svg>
    ),
  },
  {
    label: 'Leads',
    path: '/admin/leads',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Customers',
    path: '/admin/customers',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Testimonials',
    path: '/admin/testimonials',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    label: 'Problems',
    path: '/admin/problems',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    label: 'Service Lines',
    path: '/admin/service-lines',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    label: 'Site Settings',
    path: '/admin/content',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: 'Policies',
    path: '/admin/policies',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Integrations',
    path: '/admin/integrations',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m4.5-1.5l1.5-1.5a4 4 0 015.656 5.656l-3 3" />
      </svg>
    ),
  },
  {
    label: 'AI Showcase',
    path: '/admin/showcase',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

function ThemeToggleButton({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-1.5 rounded-lg text-slate-500 dark:text-gray-500 hover:text-[#1B050D] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors ${className}`}
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
  )
}

function SidebarContent({ onClose, user, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-black/[0.07] dark:border-[#2A0F1D] flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto text-[#1B050D] dark:text-white" title="Datatrop" />
        </a>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-600 border border-black/10 dark:border-[#33142A] rounded-md px-2 py-0.5">
          Admin
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[rgb(var(--brand)_/_0.08)] dark:bg-rose/10 text-[rgb(var(--brand))] visited:text-[rgb(var(--brand))] dark:text-rose-soft dark:visited:text-rose-soft border border-[rgb(var(--brand)_/_0.2)] dark:border-rose/20'
                  : 'text-slate-500 visited:text-slate-500 dark:text-gray-500 dark:visited:text-gray-500 hover:text-[#1B050D] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-black/[0.07] dark:border-[#2A0F1D] flex flex-col gap-1">
        <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/[0.07] dark:border-[#2A0F1D]">
          <div className="min-w-0">
            <p className="text-[9px] text-slate-500 dark:text-gray-600 uppercase tracking-widest mb-0.5">Signed in as</p>
            <p className="text-[#1B050D] dark:text-gray-300 text-xs font-medium truncate">{user?.email ?? '—'}</p>
          </div>
          <ThemeToggleButton />
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-slate-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.05] transition-all duration-150 w-full"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.me().then((u) => setUser(u)).catch(() => setUser(null))
  }, [])

  const handleLogout = async () => {
    try { await api.logout() } catch { /* ignore */ }
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#F6EFF4] dark:!bg-none dark:!bg-[#070305] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-[#0B0407] border-r border-black/[0.07] dark:border-[#2A0F1D] fixed top-0 bottom-0 left-0">
        <SidebarContent user={user} onLogout={handleLogout} onClose={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-white dark:bg-[#0B0407] border-r border-black/[0.07] dark:border-[#2A0F1D] flex flex-col">
            <SidebarContent user={user} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40 dark:bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-5 h-14 border-b border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0B0407] sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-slate-500 dark:text-gray-400 hover:text-[#1B050D] dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[#1B050D] dark:text-white font-semibold text-sm">Admin Panel</span>
          <ThemeToggleButton />
        </header>

        <main className="flex-1 p-5 sm:p-8 max-w-5xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

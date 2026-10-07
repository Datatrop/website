import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

const statusColor = {
  Active: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
  Completed: 'bg-slate-100 dark:bg-gray-500/10 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-500/20',
  Ongoing: 'bg-[rgb(var(--brand)_/_0.08)] text-[rgb(var(--brand))] border-[rgb(var(--brand)_/_0.2)]',
}

export default function Dashboard() {
  const [custCount, setCustCount] = useState(0)
  const [showcaseCount, setShowcaseCount] = useState(0)
  const [serviceCount, setServiceCount] = useState(0)
  const [problemCount, setProblemCount] = useState(0)
  const [newLeads, setNewLeads] = useState(0)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [cust, showc, svc, prob, leads] = await Promise.all([
        api.list('customers').catch(() => []),
        api.list('ai_showcase').catch(() => []),
        api.list('service_lines').catch(() => []),
        api.list('problems').catch(() => []),
        api.list('leads').catch(() => []),
      ])
      setCustCount(cust.length)
      setShowcaseCount(showc.length)
      setServiceCount(svc.length)
      setProblemCount(prob.length)
      setNewLeads(leads.filter((l) => !l.handled).length)
      setRecent(cust.slice(0, 5)) // customers come back newest-first
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    {
      label: 'New Leads',
      value: newLeads,
      link: '/admin/leads',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Total Customers',
      value: custCount,
      link: '/admin/customers',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Problems',
      value: problemCount,
      link: '/admin/problems',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: 'Service Lines',
      value: serviceCount,
      link: '/admin/service-lines',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'AI Showcases',
      value: showcaseCount,
      link: '/admin/showcase',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="pt-4">
        <div className="h-7 w-40 bg-black/[0.06] dark:bg-[#150811] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-60 bg-black/[0.04] dark:bg-[#10060B] rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#0D0509] border border-black/[0.07] dark:border-[#2A0F1D] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Overview of your Datatrop operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className="p-5 rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] hover:border-[rgb(var(--brand)_/_0.3)] dark:hover:border-rose/20 hover:shadow-md transition-all duration-200 group block"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 dark:text-gray-600 text-[10px] font-semibold uppercase tracking-widest">{s.label}</p>
              <div className="w-9 h-9 rounded-xl bg-[rgb(var(--brand)_/_0.06)] dark:bg-rose/[0.07] border border-[rgb(var(--brand)_/_0.12)] dark:border-rose/[0.12] flex items-center justify-center text-[rgb(var(--brand)_/_0.7)] dark:text-rose/70 group-hover:bg-[rgb(var(--brand)_/_0.12)] dark:group-hover:bg-rose/[0.12] group-hover:text-[rgb(var(--brand))] dark:group-hover:text-rose-soft transition-all duration-200">
                {s.icon}
              </div>
            </div>
            <p className="text-3xl font-black text-[#1B050D] dark:text-white">{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Recent customers */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.07] dark:border-[#2A0F1D] flex items-center justify-between">
          <h2 className="text-[#1B050D] dark:text-white font-semibold text-sm">Recent Customers</h2>
          <Link to="/admin/customers" className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] dark:text-rose-soft dark:hover:text-rose text-xs transition-colors">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-600 text-sm">
            No customers yet.{' '}
            <Link to="/admin/customers" className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] dark:text-rose-soft dark:hover:text-rose transition-colors">
              Add your first one
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06] dark:divide-[#130710]">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors">
                <div>
                  <p className="text-[#1B050D] dark:text-white text-sm font-medium">{c.name}</p>
                  <p className="text-slate-500 dark:text-gray-600 text-xs mt-0.5">{c.company || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-slate-500 dark:text-gray-600 text-xs hidden sm:block">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusColor[c.status] ?? statusColor.Active}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

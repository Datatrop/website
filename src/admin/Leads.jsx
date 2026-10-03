import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Leads() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null) // lead being viewed

  const load = async () => {
    try {
      const data = await api.list('leads')
      setItems(data ?? [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleHandled = async (lead) => {
    await api.update('leads', lead.id, { handled: !lead.handled })
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    await api.remove('leads', id)
    setOpen(null)
    load()
  }

  const fmt = (d) => (d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Leads</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Strategy-call requests submitted from the website</p>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-gray-500">
            {items.filter((l) => !l.handled).length} new · {items.length} total
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading leads…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-500 dark:text-gray-600 text-sm">No leads yet. Submissions from the website contact form will appear here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                  {['', 'Name', 'Company', 'Email', 'Industry', 'Size', 'Received', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                {items.map((l) => (
                  <tr key={l.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group cursor-pointer" onClick={() => setOpen(l)}>
                    <td className="px-5 py-4">
                      <span className={`inline-block w-2 h-2 rounded-full ${l.handled ? 'bg-slate-300 dark:bg-gray-600' : 'bg-emerald-500 dark:bg-emerald-400'}`} title={l.handled ? 'Handled' : 'New'} />
                    </td>
                    <td className="px-5 py-4 text-[#1B050D] dark:text-white font-medium whitespace-nowrap">{l.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{l.company || '—'}</td>
                    <td className="px-5 py-4 text-[rgb(var(--brand))] whitespace-nowrap">{l.email}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{l.industry || '—'}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{l.company_size || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-gray-600 whitespace-nowrap text-xs">{fmt(l.created_at)}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-slate-500 dark:text-gray-500 group-hover:text-[rgb(var(--brand))] text-xs transition-colors">View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-sm" onClick={() => setOpen(null)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0E0509] border border-black/[0.08] dark:border-[#2E1120] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[#1B050D] dark:text-white font-bold text-lg">{open.name}</h2>
                <p className="text-slate-500 dark:text-gray-500 text-sm">{open.company || 'No company'}</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-slate-500 dark:text-gray-600 hover:text-[#1B050D] dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {[['Email', open.email], ['Industry', open.industry || '—'], ['Company size', open.company_size || '—'], ['Received', fmt(open.created_at)]].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] text-slate-500 dark:text-gray-600 uppercase tracking-widest mb-1">{k}</div>
                  <div className="text-[#1B050D] dark:text-gray-200 text-sm break-words">{v}</div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <div className="text-[10px] text-slate-500 dark:text-gray-600 uppercase tracking-widest mb-1.5">Operational challenge</div>
              <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{open.challenge}</p>
            </div>

            <div className="flex items-center gap-3">
              <a href={`mailto:${open.email}`} className="flex-1 py-3 rounded-xl bg-[rgb(var(--brand))] text-white text-sm font-bold text-center transition-colors hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)]">Reply by email</a>
              <button onClick={() => toggleHandled(open).then(() => setOpen((o) => o && { ...o, handled: !o.handled }))} className="px-4 py-3 rounded-xl border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-300 hover:text-[#1B050D] dark:hover:text-white hover:border-black/20 dark:hover:border-[#3D1832] text-sm font-medium transition-colors">
                {open.handled ? 'Mark new' : 'Mark handled'}
              </button>
              <button onClick={() => handleDelete(open.id)} className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

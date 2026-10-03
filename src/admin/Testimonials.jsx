import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const emptyForm = { quote: '', name: '', role: '', company: '', rating: 5, source: 'Google', sort_order: 0, active: true }

export default function Testimonials() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try { setItems(await api.list('testimonials') ?? []) } catch { setItems([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, sort_order: items.length }); setFormError(''); setModal(true) }
  const openEdit = (it) => {
    setEditing(it)
    setForm({ quote: it.quote, name: it.name, role: it.role ?? '', company: it.company ?? '', rating: it.rating ?? 5, source: it.source ?? 'Google', sort_order: it.sort_order ?? 0, active: it.active ?? true })
    setFormError(''); setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.quote.trim() || !form.name.trim()) { setFormError('Quote and name are required'); return }
    setSaving(true); setFormError('')
    const payload = {
      quote: form.quote.trim(), name: form.name.trim(),
      role: form.role.trim() || null, company: form.company.trim() || null,
      rating: Number(form.rating) || 0, source: form.source || null,
      sort_order: Number(form.sort_order) || 0, active: form.active,
    }
    try {
      if (editing) await api.update('testimonials', editing.id, payload)
      else await api.create('testimonials', payload)
    } catch (err) { setSaving(false); setFormError(err.message); return }
    setSaving(false); setModal(false); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this testimonial? This cannot be undone.')) return
    await api.remove('testimonials', id); load()
  }
  const toggleActive = async (it) => { await api.update('testimonials', it.id, { active: !it.active }); load() }

  const inp = 'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--brand)/0.12)] transition-colors'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Testimonials</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Client feedback shown on the website (hidden entirely when none are active)</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all duration-200 hover:-translate-y-px btn-cyan-glow">+ Add Testimonial</button>
      </div>

      <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-500 dark:text-gray-600 text-sm mb-3">No testimonials yet</p>
            <button onClick={openAdd} className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] text-sm transition-colors">Add your first one →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                {['#', 'Quote', 'Name', 'Role / Company', 'Rating', 'Source', 'Active', ''].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group">
                    <td className="px-5 py-4 text-slate-500 dark:text-gray-500 tabular-nums">{it.sort_order}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-300 max-w-[280px]"><p className="truncate text-xs">{it.quote}</p></td>
                    <td className="px-5 py-4 text-[#1B050D] dark:text-white font-medium whitespace-nowrap">{it.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{[it.role, it.company].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-5 py-4 text-[rgb(var(--brand))] whitespace-nowrap">{'★'.repeat(Number(it.rating) || 0)}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{it.source || '—'}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleActive(it)} className={`relative w-10 h-5 rounded-full transition-all duration-200 ${it.active ? 'bg-[rgb(var(--brand))]' : 'bg-slate-200 dark:bg-[#33142A]'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${it.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(it)} className="text-slate-500 dark:text-gray-500 hover:text-[rgb(var(--brand))] dark:hover:text-rose-soft text-xs font-medium transition-colors">Edit</button>
                        <button onClick={() => handleDelete(it.id)} className="text-slate-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E0509] border border-black/[0.08] dark:border-[#2E1120] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#1B050D] dark:text-white font-bold text-lg">{editing ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 dark:text-gray-600 hover:text-[#1B050D] dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Quote <span className="text-[rgb(var(--brand))]">*</span></label>
                <textarea value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} rows={4} placeholder="What the client said…" className={`${inp} resize-none`} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Name <span className="text-[rgb(var(--brand))]">*</span></label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Role</label>
                  <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. COO" className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Company</label>
                  <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company" className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Rating</label>
                  <select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className={inp}>
                    {[5, 4, 3, 2, 1, 0].map((r) => <option key={r} value={r}>{r === 0 ? 'None' : `${r} ★`}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Source</label>
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inp}>
                    {['Google', 'Direct', 'LinkedIn', 'Other'].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <p className="text-slate-500 dark:text-gray-700 text-xs mt-1.5">"Google" shows the Google badge</p>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} className={inp} />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A]">
                <div><p className="text-[#1B050D] dark:text-white text-sm font-medium">Active</p><p className="text-slate-500 dark:text-gray-600 text-xs mt-0.5">Show on the website</p></div>
                <button type="button" onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className={`relative w-10 h-5 rounded-full transition-all duration-200 ${form.active ? 'bg-[rgb(var(--brand))]' : 'bg-slate-300 dark:bg-[#3D1832]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {formError && <div className="text-red-600 dark:text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-400 hover:text-[#1B050D] dark:hover:text-white hover:border-black/20 dark:hover:border-[#3D1832] text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

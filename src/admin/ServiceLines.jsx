import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const emptyForm = { name: '', examples: '', deal_size: '', sort_order: 0, active: true }

export default function ServiceLines() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      const data = await api.list('service_lines')
      setItems(data ?? [])
    } catch {
      setItems([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, sort_order: items.length })
    setFormError('')
    setModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      examples: item.examples ?? '',
      deal_size: item.deal_size ?? '',
      sort_order: item.sort_order ?? 0,
      active: item.active ?? true,
    })
    setFormError('')
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      examples: form.examples.trim() || null,
      deal_size: form.deal_size.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    }
    try {
      if (editing) {
        await api.update('service_lines', editing.id, payload)
      } else {
        await api.create('service_lines', payload)
      }
    } catch (err) {
      setSaving(false)
      setFormError(err.message)
      return
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this service line? This cannot be undone.')) return
    await api.remove('service_lines', id)
    load()
  }

  const toggleActive = async (item) => {
    await api.update('service_lines', item.id, { active: !item.active })
    load()
  }

  const inp =
    'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--brand)/0.12)] transition-colors'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Service Lines</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Manage the service lines &amp; deal sizes shown on the website</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all duration-200 hover:-translate-y-px btn-cyan-glow"
        >
          + Add Service Line
        </button>
      </div>

      {/* Empty-state hint */}
      {!loading && items.length === 0 && (
        <div className="mb-5 px-4 py-3 rounded-xl border border-[rgb(var(--brand)/0.15)] bg-[rgb(var(--brand)/0.04)] text-slate-600 dark:text-gray-400 text-xs leading-relaxed">
          No service lines saved yet — the website is showing the 5 built-in playbook defaults. Add rows here to override them.
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading service lines…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-500 dark:text-gray-600 text-sm mb-3">No service lines yet</p>
            <button onClick={openAdd} className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] text-sm transition-colors">
              Add your first service line →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                  {['#', 'Name', 'Examples', 'Deal Size', 'Active', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group">
                    <td className="px-5 py-4 text-slate-500 dark:text-gray-500 tabular-nums">{item.sort_order}</td>
                    <td className="px-5 py-4 text-[#1B050D] dark:text-white font-medium whitespace-nowrap">{item.name}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 max-w-[280px]">
                      <p className="truncate text-xs">{item.examples || '—'}</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-[rgb(var(--brand)/0.08)] border border-[rgb(var(--brand)/0.18)] text-[rgb(var(--brand))] font-semibold">
                        {item.deal_size || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`relative w-10 h-5 rounded-full transition-all duration-200 focus:outline-none ${
                          item.active ? 'bg-[rgb(var(--brand))]' : 'bg-slate-200 dark:bg-[#33142A]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                            item.active ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-slate-500 dark:text-gray-500 hover:text-[rgb(var(--brand))] text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-500 dark:text-gray-500 hover:text-red-400 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0E0509] border border-black/[0.08] dark:border-[#2E1120] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#1B050D] dark:text-white font-bold text-lg">{editing ? 'Edit Service Line' : 'Add Service Line'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 dark:text-gray-600 hover:text-[#1B050D] dark:hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                  Name <span className="text-[rgb(var(--brand))]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Enterprise AI Systems"
                  className={inp}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                  Examples
                </label>
                <textarea
                  value={form.examples}
                  onChange={(e) => setForm((f) => ({ ...f, examples: e.target.value }))}
                  rows={3}
                  placeholder="ERP modernization, unified business platforms, custom enterprise software…"
                  className={`${inp} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                    Deal Size
                  </label>
                  <input
                    type="text"
                    value={form.deal_size}
                    onChange={(e) => setForm((f) => ({ ...f, deal_size: e.target.value }))}
                    placeholder="₹10L – ₹2Cr+"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A]">
                <div>
                  <p className="text-[#1B050D] dark:text-white text-sm font-medium">Active</p>
                  <p className="text-slate-500 dark:text-gray-600 text-xs mt-0.5">Show this service line on the website</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  className={`relative w-10 h-5 rounded-full transition-all duration-200 focus:outline-none ${
                    form.active ? 'bg-[rgb(var(--brand))]' : 'bg-slate-300 dark:bg-[#3D1832]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      form.active ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {formError && (
                <div className="text-red-600 dark:text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-3 rounded-xl border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-400 hover:text-[#1B050D] dark:hover:text-white hover:border-black/20 dark:hover:border-[#3D1832] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Service Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

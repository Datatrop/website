import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const SERVICE_OPTIONS = [
  'Business System',
  'Process Automation',
  'AI Integration',
  'Data Pipeline',
  'Custom Tools',
  'Workflow Optimization',
]

const STATUS_OPTIONS = ['Active', 'Completed', 'Ongoing']

const statusColor = {
  Active: 'bg-green-500/10 text-green-400 border-green-500/20',
  Completed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Ongoing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}

const emptyForm = { name: '', company: '', services: [], status: 'Active' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      const data = await api.list('customers')
      setCustomers(data ?? [])
    } catch {
      setCustomers([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setModal(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, company: c.company ?? '', services: c.services ?? [], status: c.status })
    setFormError('')
    setModal(true)
  }

  const toggleService = (s) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Customer name is required'); return }
    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      services: form.services,
      status: form.status,
    }
    try {
      if (editing) {
        await api.update('customers', editing.id, payload)
      } else {
        await api.create('customers', payload)
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
    if (!confirm('Delete this customer? This cannot be undone.')) return
    await api.remove('customers', id)
    load()
  }

  const inp =
    'w-full px-4 py-3 rounded-xl bg-[#0c0c0c] border border-[#222] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/[0.12] transition-colors'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your client relationships</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-all duration-200 hover:-translate-y-px btn-cyan-glow"
        >
          + Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#1a1a1a] bg-[#090909] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm animate-pulse">Loading customers…</div>
        ) : customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-gray-600 text-sm mb-3">No customers yet</p>
            <button onClick={openAdd} className="text-blue-400 hover:text-blue-500 text-sm transition-colors">
              Add your first customer →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  {['Name', 'Company', 'Services', 'Status', 'Date Added', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0f0f0f]">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.015] transition-colors group">
                    <td className="px-5 py-4 text-white font-medium whitespace-nowrap">{c.name}</td>
                    <td className="px-5 py-4 text-gray-400 whitespace-nowrap">{c.company || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {(c.services ?? []).length > 0
                          ? (c.services ?? []).map((s) => (
                              <span
                                key={s}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/[0.07] border border-blue-500/[0.14] text-blue-500/70 whitespace-nowrap"
                              >
                                {s}
                              </span>
                            ))
                          : <span className="text-gray-700 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusColor[c.status] ?? statusColor.Active}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap text-xs">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-gray-500 hover:text-blue-500 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-gray-500 hover:text-red-400 text-xs font-medium transition-colors"
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-600 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                  Customer Name <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className={inp}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Company or organisation"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Services Built
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleService(s)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150 ${
                        form.services.includes(s)
                          ? 'bg-blue-500/15 border-blue-500/40 text-blue-500'
                          : 'border-[#222] text-gray-500 hover:border-[#333] hover:text-gray-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={inp}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#222] text-gray-400 hover:text-white hover:border-[#333] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

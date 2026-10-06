import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// Posts for the public News & Events page (/news). Events dated today or later
// show under "Upcoming"; everything else is listed newest first.
const KINDS = ['Event', 'News', 'Award', 'Partnership', 'Talk', 'Launch']
const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = { title: '', kind: 'Event', event_date: today(), location: '', summary: '', body: '', image_url: '', link_url: '', link_label: '', active: true }

export default function News() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try { setItems(await api.list('posts') ?? []) } catch { setItems([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, event_date: today() }); setFormError(''); setModal(true) }
  const openEdit = (it) => {
    setEditing(it)
    setForm({
      title: it.title, kind: it.kind || 'News', event_date: (it.event_date || today()).slice(0, 10),
      location: it.location ?? '', summary: it.summary ?? '', body: it.body ?? '', image_url: it.image_url ?? '',
      link_url: it.link_url ?? '', link_label: it.link_label ?? '', active: it.active ?? true,
    })
    setFormError(''); setModal(true)
  }

  const handleImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true); setFormError('')
    try {
      const { url } = await api.uploadImage(file)
      setForm((f) => ({ ...f, image_url: url }))
    } catch (err) { setFormError(err.message) }
    setUploading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.event_date) { setFormError('Title and date are required'); return }
    if (form.link_url.trim() && !/^https?:\/\//i.test(form.link_url.trim())) { setFormError('The link must start with https://'); return }
    setSaving(true); setFormError('')
    const clean = (v) => v.trim() || null
    const payload = {
      title: form.title.trim(), kind: form.kind, event_date: form.event_date,
      location: clean(form.location), summary: clean(form.summary), body: clean(form.body),
      image_url: clean(form.image_url), link_url: clean(form.link_url), link_label: clean(form.link_label),
      active: form.active,
    }
    try {
      if (editing) await api.update('posts', editing.id, payload)
      else await api.create('posts', payload)
    } catch (err) { setSaving(false); setFormError(err.message); return }
    setSaving(false); setModal(false); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await api.remove('posts', id); load()
  }
  const toggleActive = async (it) => { await api.update('posts', it.id, { active: !it.active }); load() }

  const inp = 'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--brand)/0.12)] transition-colors'
  const lbl = 'block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">News &amp; Events</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">What we've been up to, shown on the website's News page</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all duration-200 hover:-translate-y-px btn-cyan-glow">+ Add Post</button>
      </div>

      <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-500 dark:text-gray-600 text-sm mb-3">No posts yet</p>
            <button onClick={openAdd} className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] text-sm transition-colors">Add your first one →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead><tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                {['', 'Title', 'Type', 'Date', 'Location', 'Active', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group">
                    <td className="pl-5 py-3 w-16">
                      {it.image_url
                        ? <img src={it.image_url} alt="" className="w-12 h-9 rounded-md object-cover" />
                        : <span className="block w-12 h-9 rounded-md bg-slate-100 dark:bg-[#1A0912]" />}
                    </td>
                    <td className="px-5 py-4 text-[#1B050D] dark:text-white font-medium max-w-[300px]"><p className="truncate">{it.title}</p></td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{it.kind}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs tabular-nums">{(it.event_date || '').slice(0, 10)}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap text-xs">{it.location || '—'}</td>
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
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0E0509] border border-black/[0.08] dark:border-[#2E1120] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#1B050D] dark:text-white font-bold text-lg">{editing ? 'Edit Post' : 'Add Post'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-500 dark:text-gray-600 hover:text-[#1B050D] dark:hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className={lbl}>Title <span className="text-[rgb(var(--brand))]">*</span></label>
                <input value={form.title} onChange={set('title')} placeholder="e.g. Speaking at Kerala AI Summit 2026" className={inp} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Type</label>
                  <select value={form.kind} onChange={set('kind')} className={inp}>
                    {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date <span className="text-[rgb(var(--brand))]">*</span></label>
                  <input type="date" value={form.event_date} onChange={set('event_date')} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Location</label>
                <input value={form.location} onChange={set('location')} placeholder="e.g. Kochi, India (optional)" className={inp} />
              </div>
              <div>
                <label className={lbl}>Photo</label>
                <div className="flex items-center gap-4">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-28 h-20 rounded-lg object-cover border border-black/10 dark:border-[#33142A]" />
                    : <span className="w-28 h-20 rounded-lg bg-[#FAF5F8] dark:bg-[#10060B] border border-dashed border-black/15 dark:border-[#33142A]" />}
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer text-sm text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] font-medium">
                      {uploading ? 'Uploading…' : form.image_url ? 'Replace photo' : 'Upload photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="hidden" disabled={uploading} />
                    </label>
                    {form.image_url && <button type="button" onClick={() => setForm((f) => ({ ...f, image_url: '' }))} className="text-left text-xs text-slate-500 dark:text-gray-500 hover:text-red-500">Remove</button>}
                    <p className="text-slate-500 dark:text-gray-700 text-xs">JPG, PNG or WebP, up to 8 MB. Landscape works best.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>Summary</label>
                <textarea value={form.summary} onChange={set('summary')} rows={3} placeholder="One or two sentences shown on the card" className={`${inp} resize-none`} />
              </div>
              <div>
                <label className={lbl}>Full story</label>
                <textarea value={form.body} onChange={set('body')} rows={5} placeholder="Optional. Shown when someone opens the post. Blank lines start new paragraphs." className={`${inp} resize-y`} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Link</label>
                  <input value={form.link_url} onChange={set('link_url')} placeholder="https://… (LinkedIn post, registration)" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Link text</label>
                  <input value={form.link_label} onChange={set('link_label')} placeholder="Read more" className={inp} />
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
                <button type="submit" disabled={saving || uploading} className="flex-1 py-3 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

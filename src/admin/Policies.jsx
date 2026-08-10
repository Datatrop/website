import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { POLICY_DEFAULTS } from '../PolicyPage.jsx'

export default function Policies() {
  const [form, setForm] = useState({ privacy_policy: '', terms: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSingle('site_content')
      .then((row) => {
        setForm({
          privacy_policy: (row && row.privacy_policy) || POLICY_DEFAULTS.privacy,
          terms: (row && row.terms) || POLICY_DEFAULTS.terms,
        })
      })
      .catch(() => setForm({ privacy_policy: POLICY_DEFAULTS.privacy, terms: POLICY_DEFAULTS.terms }))
      .finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setSuccess(false); setError('') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      await api.saveContent(form) // partial update — only touches privacy_policy + terms
      setSuccess(true)
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const ta = 'w-full px-4 py-3 rounded-xl bg-[#0c0c0c] border border-[#222] text-white placeholder-gray-600 text-sm font-mono leading-relaxed focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/[0.12] transition-colors resize-y'
  const lbl = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5'

  if (loading) return <div className="max-w-3xl"><div className="h-64 rounded-2xl bg-[#090909] border border-[#1a1a1a] animate-pulse" /></div>

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Policies</h1>
        <p className="text-gray-500 text-sm mt-1">
          Edit the Privacy Policy and Terms shown at
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-500"> /privacy</a> and
          <a href="/terms" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-500"> /terms</a>.
          Start a line with <span className="font-mono text-gray-400">## </span> to make it a heading.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="p-6 rounded-2xl border border-[#1a1a1a] bg-[#090909]">
          <label className={lbl}>Privacy Policy</label>
          <textarea value={form.privacy_policy} onChange={set('privacy_policy')} rows={14} className={ta} />
        </div>
        <div className="p-6 rounded-2xl border border-[#1a1a1a] bg-[#090909]">
          <label className={lbl}>Terms of Service</label>
          <textarea value={form.terms} onChange={set('terms')} rows={14} className={ta} />
        </div>

        {error && <div className="text-red-400 text-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</div>}
        {success && (
          <div className="flex items-center gap-2.5 text-green-400 text-sm px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Saved. The policy pages now show your changes.
          </div>
        )}

        <button type="submit" disabled={saving} className="self-start px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all duration-200 hover:-translate-y-px disabled:opacity-50 btn-cyan-glow">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

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

  const ta = 'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm font-mono leading-relaxed focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--brand)_/_0.12)] transition-colors resize-y'
  const lbl = 'block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5'

  if (loading) return <div className="max-w-3xl"><div className="h-64 rounded-2xl bg-white dark:bg-[#0D0509] border border-black/[0.07] dark:border-[#2A0F1D] animate-pulse" /></div>

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Policies</h1>
        <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">
          Edit the Privacy Policy and Terms shown at
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))]"> /privacy</a> and
          <a href="/terms" target="_blank" rel="noreferrer" className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))]"> /terms</a>.
          Start a line with <span className="font-mono text-slate-600 dark:text-gray-400">## </span> to make it a heading.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="p-6 rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509]">
          <label className={lbl}>Privacy Policy</label>
          <textarea value={form.privacy_policy} onChange={set('privacy_policy')} rows={14} className={ta} />
        </div>
        <div className="p-6 rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509]">
          <label className={lbl}>Terms of Service</label>
          <textarea value={form.terms} onChange={set('terms')} rows={14} className={ta} />
        </div>

        {error && <div className="text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">{error}</div>}
        {success && (
          <div className="flex items-center gap-2.5 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Saved. The policy pages now show your changes.
          </div>
        )}

        <button type="submit" disabled={saving} className="self-start px-6 py-3.5 rounded-xl bg-[rgb(var(--brand))] text-white font-bold text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const DEFAULTS = {
  company_name: 'Datatrop AI Systems',
  tagline: 'Engineering Intelligence. Solving Complexity.',
  hero_headline: 'Engineering Intelligence for Complex Businesses.',
  hero_subtext:
    'When conventional software reaches its limits, we design AI-powered business systems that transform operational complexity into clarity, control, and autonomous execution.',
  about_bio:
    'Datatrop AI Systems is a technology engineering company focused on solving the complex operational, analytical, and data-driven challenges that conventional software cannot adequately address.',
  contact_email: 'sales@datatrop.in',
  contact_phone: '+91 79029 17795',
  linkedin_url: 'https://www.linkedin.com/company/datatrop-ai',
  location: 'Kerala, India',
  brand_color: '#3B82F6',
  accent_color: '#10B981',
  google_reviews_url: '',
}

const KEYS = Object.keys(DEFAULTS)

export default function Content() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSingle('site_content')
      .then((row) => {
        if (row) {
          const next = { ...DEFAULTS }
          for (const k of KEYS) if (row[k] != null && row[k] !== '') next[k] = row[k]
          setForm(next)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setSuccess(false); setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      await api.saveContent(form) // partial update — leaves policies untouched
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-4 py-3 rounded-xl bg-[#0c0c0c] border border-[#222] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/[0.12] transition-colors'
  const lbl = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5'
  const card = 'p-6 rounded-2xl border border-[#1a1a1a] bg-[#090909] flex flex-col gap-5'

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="h-7 w-48 bg-[#111] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#0c0c0c] rounded-lg animate-pulse mb-8" />
        <div className="h-64 rounded-2xl bg-[#090909] border border-[#1a1a1a] animate-pulse" />
      </div>
    )
  }

  const ColorField = ({ k, label }) => (
    <div>
      <label className={lbl}>{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={form[k]} onChange={set(k)} className="h-11 w-14 rounded-lg bg-[#0c0c0c] border border-[#222] cursor-pointer p-1" />
        <input type="text" value={form[k]} onChange={set(k)} className={`${inp} font-mono`} />
        <span className="w-9 h-9 rounded-lg border border-[#222] flex-shrink-0" style={{ background: form[k] }} />
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Site Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Company details, contact info, and theme — changes go live after saving.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {/* Company & brand */}
        <div className={card}>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Company</p>
          <div>
            <label className={lbl}>Company Name</label>
            <input type="text" value={form.company_name} onChange={set('company_name')} className={inp} />
            <p className="text-gray-700 text-xs mt-1.5">Used in the footer and copyright</p>
          </div>
          <div>
            <label className={lbl}>Tagline</label>
            <input type="text" value={form.tagline} onChange={set('tagline')} className={inp} />
            <p className="text-gray-700 text-xs mt-1.5">Short line under the footer logo</p>
          </div>
        </div>

        {/* Hero */}
        <div className={card}>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Hero</p>
          <div>
            <label className={lbl}>Headline</label>
            <input type="text" value={form.hero_headline} onChange={set('hero_headline')} className={inp} />
          </div>
          <div>
            <label className={lbl}>Subtext</label>
            <textarea value={form.hero_subtext} onChange={set('hero_subtext')} rows={3} className={`${inp} resize-none`} />
          </div>
          <div>
            <label className={lbl}>About / Who We Are</label>
            <textarea value={form.about_bio} onChange={set('about_bio')} rows={3} className={`${inp} resize-none`} />
          </div>
        </div>

        {/* Contact */}
        <div className={card}>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Contact</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.contact_email} onChange={set('contact_email')} className={inp} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input type="text" value={form.contact_phone} onChange={set('contact_phone')} className={inp} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={lbl}>LinkedIn URL</label>
              <input type="url" value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/company/…" className={inp} />
            </div>
            <div>
              <label className={lbl}>Location</label>
              <input type="text" value={form.location} onChange={set('location')} className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Google Reviews URL</label>
            <input type="url" value={form.google_reviews_url} onChange={set('google_reviews_url')} placeholder="https://g.page/r/…/review" className={inp} />
            <p className="text-gray-700 text-xs mt-1.5">Adds a "Read all reviews on Google" button under the client feedback section</p>
          </div>
        </div>

        {/* Theme */}
        <div className={card}>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Theme Colors</p>
          <div className="grid sm:grid-cols-2 gap-5">
            <ColorField k="brand_color" label="Primary Color" />
            <ColorField k="accent_color" label="Accent Color" />
          </div>
          <p className="text-gray-700 text-xs">Applied across buttons, links, highlights and the background on the live site.</p>
        </div>

        {error && <div className="text-red-400 text-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</div>}
        {success && (
          <div className="flex items-center gap-2.5 text-green-400 text-sm px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Saved. The website now shows your changes.
          </div>
        )}

        <button type="submit" disabled={saving} className="px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all duration-200 hover:-translate-y-px disabled:opacity-50 btn-cyan-glow">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

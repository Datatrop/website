import { useState, useEffect } from 'react'
import { api } from './lib/api'

// Default boilerplate shown until you edit the text in Admin → Policies.
// Use "## " at the start of a line for a section heading.
export const POLICY_DEFAULTS = {
  privacy: `Datatrop AI Systems ("Datatrop", "we", "us") respects your privacy. This policy explains what information we collect and how we use it.

## Information We Collect
When you submit the contact or strategy-call form, we collect the details you provide — your name, company, work email, industry, company size, and the challenge you describe. We do not collect payment information through this website.

## How We Use It
We use your information solely to respond to your enquiry, schedule conversations, and understand whether Datatrop is a fit for your organization. We do not sell your data.

## Data Storage
Submissions are stored securely and retained only as long as needed to serve your enquiry and our legitimate business interests.

## Third Parties
We may use trusted service providers (such as hosting and communication tools) to operate this website. They process data only on our behalf.

## Cookies and Analytics
If you choose "Accept analytics" in the cookie banner, we use Google Analytics to understand how visitors use this website, such as which pages are viewed and which buttons are clicked. Google Analytics sets cookies and collects usage data, including an approximate location and device information; IP addresses are anonymised. We do not use advertising cookies. If you decline, no analytics cookies are set. You can change your choice at any time through "Cookie settings" in the footer of the main website.

## Your Rights
You may request access to, correction of, or deletion of the personal information you have shared with us by contacting us.

## Contact
For any privacy questions, email us at the address listed in the Contact section of our website.`,

  terms: `These Terms govern your use of the Datatrop AI Systems website. By using this website, you agree to these Terms.

## Use of the Website
This website and its content are provided for general information about Datatrop's services. You agree to use it lawfully and not to misuse or attempt to disrupt it.

## Intellectual Property
All content, branding, and materials on this website are owned by Datatrop AI Systems unless stated otherwise, and may not be reproduced without permission.

## No Warranty
The website is provided "as is". While we aim for accuracy, we make no warranties about the completeness or reliability of its content.

## Limitation of Liability
Datatrop is not liable for any indirect or consequential loss arising from your use of this website.

## Engagements
Any consulting or product engagement with Datatrop is governed by a separate written agreement, not by these website Terms.

## Contact
Questions about these Terms can be sent to the address listed in the Contact section of our website.`,
}

function hexToChannels(hex) {
  if (typeof hex !== 'string') return null
  const m = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  return `${parseInt(m.slice(0, 2), 16)} ${parseInt(m.slice(2, 4), 16)} ${parseInt(m.slice(4, 6), 16)}`
}

function renderBody(text) {
  return text.split('\n').map((raw, i) => {
    const line = raw.trim()
    if (!line) return null
    if (line.startsWith('## ')) {
      return <h2 key={i} className="font-display text-white text-xl font-medium mt-10 mb-3">{line.slice(3)}</h2>
    }
    return <p key={i} className="text-white/60 font-light leading-relaxed mb-4">{line}</p>
  })
}

export default function PolicyPage({ which }) {
  const [settings, setSettings] = useState({})
  const title = which === 'terms' ? 'Terms of Service' : 'Privacy Policy'

  useEffect(() => {
    document.title = `${title} — Datatrop AI Systems`
    api.getContent().then((row) => {
      if (!row) return
      setSettings(row)
      const brand = hexToChannels(row.brand_color)
      const accent = hexToChannels(row.accent_color)
      if (brand) document.documentElement.style.setProperty('--brand', brand)
      if (accent) document.documentElement.style.setProperty('--accent', accent)
    }).catch(() => {})
  }, [title])

  const company = settings.company_name || 'Datatrop AI Systems'
  const dbText = which === 'terms' ? settings.terms : settings.privacy_policy
  const body = (dbText && dbText.trim()) ? dbText : POLICY_DEFAULTS[which] || POLICY_DEFAULTS.privacy

  return (
    <div className="min-h-screen bg-[#070305] text-white">
      {/* Simple top bar */}
      <header className="border-b border-white/[0.07] bg-brand-gradient">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <a href="/" className="font-display text-white font-medium tracking-tight">{company}</a>
          <a href="/" className="text-sm text-slate-400 hover:text-white font-light transition-colors">← Back to site</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-16">
        <span className="inline-flex items-center gap-2 font-mono text-white/55 text-[11px] uppercase tracking-[0.22em] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-rose" />
          Legal
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-medium tracking-[-0.03em] mb-10">{title}</h1>
        <div>{renderBody(body)}</div>
      </main>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-xs font-light">© 2026 {company}. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-slate-500 hover:text-slate-200 text-xs font-light">Privacy</a>
            <a href="/terms" className="text-slate-500 hover:text-slate-200 text-xs font-light">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

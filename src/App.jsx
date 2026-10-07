import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { api } from './lib/api'
import { PAGE_META, pageKeyFromPath, applyPageMeta } from './seo'
import { useInView } from './hooks'
import { ProblemScene, CapabilityViz, StatTiles } from './visuals'
import PhilosophyViz from './PhilosophyViz.jsx'
import Globe from './Globe.jsx'
import whoWeAreImg from './assets/home/who-we-are.jpg'
import exploreAboutImg from './assets/home/explore-about.jpg'
import exploreWhatImg from './assets/home/explore-what-we-do.jpg'
import exploreIndustriesImg from './assets/home/explore-industries.jpg'
import caseOperationsImg from './assets/home/case-operations.jpg'
import caseAutomotiveImg from './assets/home/case-automotive.jpg'
import caseVoiceImg from './assets/home/case-voice.jpg'
import ctaRoadImg from './assets/home/cta-road.jpg'
import pageAboutImg from './assets/pages/about.jpg'
import pageWhatImg from './assets/pages/what-we-do.jpg'
import pageIndustriesImg from './assets/pages/industries.jpg'
import pageNewsImg from './assets/pages/news.jpg'
import pageContactImg from './assets/pages/contact.jpg'
import IntroOverlay from './IntroOverlay.jsx'
import Logo from './Logo.jsx'
import { problemKind, capabilityKind } from './vizKinds'
import { initAnalytics, trackPageView, track, analyticsAvailable, getConsent, setConsent } from './analytics'

// ── Booking: handled natively by <BookingWidget/>, which reads real availability
//    from the connected Outlook calendar and books the meeting on it.
//    "Book Strategy Call" buttons scroll straight to the scheduler.
const BOOKING_URL = ''

// ── Scroll progress through an element (0 → 1), used by the statement reveal ──
function useScrollProgress() {
  const ref = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [progress, setProgress] = useState(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // Starts as the text enters the lower part of the screen and is fully
      // lit by the time its centre reaches 60% of the screen height, so the
      // whole line is readable while it sits mid-screen.
      const start = vh * 0.9
      const end = vh * 0.6 - r.height / 2
      const v = (start - r.top) / Math.max(1, start - end)
      setProgress(Math.max(0, Math.min(1, v)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])
  return [ref, progress]
}

const bookProps = BOOKING_URL
  ? { href: BOOKING_URL, target: '_blank', rel: 'noopener noreferrer' }
  : { href: '/contact#book' }

const reveal = (inView) => `transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`

function Arrow({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 12h14m-6-6l6 6-6 6" />
    </svg>
  )
}

// ── Booking widget — real availability from Outlook, books onto the calendar ──
function BookingWidget() {
  const [days, setDays] = useState([])
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot, setSlot] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', company: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)
  const [offline, setOffline] = useState(false)

  // Next 14 weekdays
  useEffect(() => {
    const out = []
    const d = new Date()
    while (out.length < 14) {
      d.setDate(d.getDate() + 1)
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        out.push({ iso, dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate(), mon: d.toLocaleDateString('en-IN', { month: 'short' }) })
      }
    }
    setDays(out)
    setDate(out[0]?.iso || '')
  }, [])

  // Load availability whenever the date changes
  useEffect(() => {
    if (!date) return
    let cancelled = false
    setLoadingSlots(true); setSlots(null); setSlot(null); setErr('')
    api.bookingSlots(date)
      .then((r) => {
        if (cancelled) return
        if (r.connected === false) setOffline(true)
        setSlots(r.slots || [])
      })
      .catch(() => { if (!cancelled) { setSlots([]); setOffline(true) } })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [date])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await api.createBooking({ ...form, start: slot.start })
      track('book_call', { method: 'calendar' })
      setDone(r)
    } catch (e2) {
      setErr(e2.message || 'Could not complete the booking.')
      if (/just taken/i.test(e2.message || '')) {
        api.bookingSlots(date).then((r) => setSlots(r.slots || [])).catch(() => {})
        setSlot(null)
      }
    } finally { setBusy(false) }
  }

  const selected = 'border-[rgb(var(--accent)_/_0.6)] bg-[rgb(var(--accent)_/_0.12)] text-white'
  const idle = 'border-white/10 text-white/55 hover:border-white/25 hover:text-white'

  if (done) {
    return (
      <div className="p-10 text-center">
        <div className="icon-tile w-14 h-14 mx-auto mb-5">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="font-display text-white text-xl mb-2">You're booked in</h3>
        <p className="text-white/70 font-light">{done.when} at {done.time} IST</p>
        <p className="text-white/50 text-sm font-light mt-3">A calendar invite is on its way to {form.email}.</p>
        {done.join && (
          <a href={done.join} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-rose-soft text-sm font-light hover:underline">Meeting link →</a>
        )}
      </div>
    )
  }

  if (offline) {
    return (
      <div className="p-10 text-center">
        <p className="text-white/75 font-light">Online booking is temporarily unavailable.</p>
        <p className="text-white/50 text-sm font-light mt-2">Please send us a message below and we'll arrange a time.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Date strip */}
      <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.2em] mb-3">Select a date</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-7">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setDate(d.iso)}
            className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all ${date === d.iso ? selected : idle}`}
          >
            <span className="block text-[10px] uppercase tracking-wide">{d.dow}</span>
            <span className="block text-lg font-light leading-tight">{d.day}</span>
            <span className="block text-[10px] opacity-70">{d.mon}</span>
          </button>
        ))}
      </div>

      {/* Slots */}
      <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.2em] mb-3">Available times · IST</p>
      {loadingSlots ? (
        <p className="text-white/50 text-sm font-light py-6">Checking the calendar…</p>
      ) : slots && slots.length === 0 ? (
        <p className="text-white/50 text-sm font-light py-6">No times left on this day. Try another date.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-7">
          {(slots || []).map((s) => (
            <button
              key={s.start}
              onClick={() => { setSlot(s); setErr('') }}
              className={`py-2.5 rounded-xl border text-sm font-light transition-all ${slot?.start === s.start ? selected : idle}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Details form, once a slot is chosen */}
      {slot && (
        <form onSubmit={submit} className="flex flex-col gap-4 pt-6 border-t border-white/10">
          <p className="text-white/60 text-sm font-light">
            Booking <span className="text-white">{slot.label}</span> on{' '}
            <span className="text-white">{days.find((d) => d.iso === date)?.dow} {days.find((d) => d.iso === date)?.day} {days.find((d) => d.iso === date)?.mon}</span> · 30 min
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} />
            <input required type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} />
          </div>
          <input placeholder="Company (optional)" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={INPUT} />
          <textarea rows={3} placeholder="What would you like to discuss? (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${INPUT} resize-none`} />
          {err && <div className="text-red-300 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">{err}</div>}
          <button type="submit" disabled={busy} className="btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Confirming…' : 'Confirm Booking'}
          </button>
        </form>
      )}
    </div>
  )
}

const INPUT = 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/35 text-sm font-light focus:outline-none focus:border-[rgb(var(--accent)_/_0.6)] focus:bg-white/[0.06] transition-colors [&>option]:bg-[rgb(var(--surface))]'

// ── Buttons ───────────────────────────────────────────────────────────────────
function BookButton({ children = 'Book Strategy Call', className = '' }) {
  return (
    <a {...bookProps} className={`btn-primary px-7 py-4 ${className}`}>
      {children}
      <Arrow />
    </a>
  )
}

function GhostButton({ href, children, className = '' }) {
  return (
    <a href={href} className={`btn-secondary px-7 py-4 ${className}`}>
      {children}
      <Arrow />
    </a>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function Eyebrow({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/55 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose" />
      {children}
    </span>
  )
}

function SectionHead({ eyebrow, title, intro, inView, center = false }) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} max-w-3xl mb-14 sm:mb-16 ${reveal(inView)}`}>
      {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
      <h2 className="font-display text-[34px] sm:text-5xl lg:text-[56px] font-medium text-white tracking-[-0.03em] leading-[1.04] text-balance">
        {title}
      </h2>
      {intro && <p className={`mt-6 text-white/60 text-base sm:text-lg font-light leading-relaxed ${center ? 'mx-auto' : ''} max-w-2xl`}>{intro}</p>}
    </div>
  )
}

const WRAP = 'max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-10'

// Used until Admin → Site Settings provides one (and in the static preview)
const DEFAULT_LINKEDIN = 'https://www.linkedin.com/company/datatrop-ai'

// ── Logo (vector, see src/Logo.jsx) ───────────────────────────────────────────
function LogoMark({ footer = false }) {
  return <Logo className="block w-auto text-white" style={{ height: footer ? '32px' : '28px' }} />
}

// ── Glowing arcs, as on the brand board's hero variations ─────────────────────
function Arcs({ className = '', variant = 'hero' }) {
  const id = `arc-${variant}`
  const paths = variant === 'hero'
    ? ['M1500 -40 C 1180 120, 980 420, 940 900', 'M1500 60 C 1260 220, 1100 480, 1080 900', 'M1600 -60 C 1240 60, 860 300, 620 900']
    : ['M-40 520 C 300 300, 620 560, 1240 120', 'M-40 600 C 340 360, 700 640, 1240 220']
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F08DB0" stopOpacity="0" />
          <stop offset="0.35" stopColor="#F08DB0" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#E0457B" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8A2A91" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <g className="arc-float">
        {/* Soft glow underlay */}
        <g filter={`url(#${id}-blur)`} opacity="0.7" className="arc-draw">
          {paths.map((d, i) => <path key={i} d={d} stroke={`url(#${id}-g)`} strokeWidth={i === 0 ? 10 : 6} />)}
        </g>
        {/* Crisp highlight line */}
        <g className="arc-draw">
          {paths.map((d, i) => <path key={i} d={d} stroke={`url(#${id}-g)`} strokeWidth={i === 0 ? 1.4 : 0.8} opacity={i === 0 ? 1 : 0.55} />)}
        </g>
      </g>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR — mega-menu structure (top-level items with hover-revealed panels)
// ═══════════════════════════════════════════════════════════════════════════════
const MEGA_MENU = [
  {
    label: 'About',
    page: 'about',
    href: '/about',
    panel: [
      { title: 'Who We Are', desc: 'Why we exist and what we believe.', href: '/about#who-we-are' },
      { title: 'Our Philosophy', desc: 'Decipher, derive, Datatrop.', href: '/about#philosophy' },
      { title: 'How We Engage', desc: 'Build, solve and innovate.', href: '/about#engage' },
      { title: 'Why Datatrop', desc: 'Our approach, in numbers.', href: '/about#why' },
    ],
  },
  {
    label: 'What We Do',
    page: 'what-we-do',
    href: '/what-we-do',
    panel: [
      { title: 'Capabilities', desc: 'The five system categories we engineer.', href: '/what-we-do#capabilities' },
      { title: 'AI Workforce Platforms', desc: 'Multi-agent teams that execute operational work.', href: '/what-we-do#workforce' },
      { title: 'Problems We Solve', desc: 'Fragmentation, leakage, delay and more.', href: '/what-we-do#solve' },
      { title: 'Talk to an Engineer', desc: 'Book a 30-minute strategy call.', href: '/contact#book' },
    ],
  },
  {
    label: 'Industries',
    page: 'industries',
    href: '/industries',
    panel: [
      { title: 'Manufacturing', desc: 'Operational systems for production complexity.', href: '/industries#manufacturing' },
      { title: 'Distribution & Trading', desc: 'Systems that keep fast-moving supply chains in sync.', href: '/industries#distribution' },
      { title: 'Healthcare', desc: 'Intelligent systems for regulated, data-heavy environments.', href: '/industries#healthcare' },
      { title: 'Financial Services', desc: 'Decision intelligence for complex, high-stakes operations.', href: '/industries#financial-services' },
    ],
  },
]

function Navbar({ page }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [openPanel, setOpenPanel] = useState(null)
  const [mobilePanel, setMobilePanel] = useState(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const solid = scrolled || openPanel || menuOpen

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${solid ? 'bg-[rgb(var(--surface)/0.85)] backdrop-blur-xl border-b border-white/[0.07]' : 'bg-transparent border-b border-transparent'}`}
        onMouseLeave={() => setOpenPanel(null)}
      >
        <div className={WRAP}>
          <div className="flex items-center justify-between h-[72px]">
            <a href="/" aria-label="Datatrop home"><LogoMark /></a>

            <div className="hidden lg:flex items-center gap-1">
              {MEGA_MENU.map((m) => (
                <div key={m.label} onMouseEnter={() => setOpenPanel(m.label)}>
                  <a
                    href={m.href}
                    aria-current={page === m.page ? 'page' : undefined}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[14px] transition-colors duration-200 ${openPanel === m.label || page === m.page ? 'text-white' : 'text-white/65 hover:text-white'}`}
                  >
                    {m.label}
                    {page === m.page && <span className="absolute left-4 right-7 -bottom-0.5 h-px bg-gradient-to-r from-rose to-transparent" />}
                    <svg className={`w-3 h-3 transition-transform duration-200 ${openPanel === m.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                </div>
              ))}
              <a href="/news" onMouseEnter={() => setOpenPanel(null)} aria-current={page === 'news' ? 'page' : undefined} className={`px-4 py-2.5 text-[14px] hover:text-white transition-colors duration-200 ${page === 'news' ? 'text-white' : 'text-white/65'}`}>News</a>
              <a href="/contact" onMouseEnter={() => setOpenPanel(null)} aria-current={page === 'contact' ? 'page' : undefined} className={`px-4 py-2.5 text-[14px] hover:text-white transition-colors duration-200 ${page === 'contact' ? 'text-white' : 'text-white/65'}`}>Contact</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <a href="/contact#message" className="btn-secondary px-5 py-3 text-[13px]">Send a message</a>
              <a {...bookProps} className="btn-primary px-5 py-3 text-[13px]">Book a call <Arrow className="w-3.5 h-3.5" /></a>
            </div>

            <button onClick={() => setMenuOpen((o) => !o)} className="lg:hidden p-2 -mr-2 text-white" aria-label="Menu" aria-expanded={menuOpen}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>

          {/* Desktop mega-menu panel */}
          {openPanel && (
            <div className="hidden lg:block border-t border-white/[0.07] py-7 anim-fade">
              <div className="grid grid-cols-4 gap-4">
                {MEGA_MENU.find((m) => m.label === openPanel)?.panel.map((p) => (
                  <a key={p.title} href={p.href} onClick={() => setOpenPanel(null)} className="group p-4 rounded-2xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.035] transition-colors">
                    <h4 className="text-white text-sm font-medium mb-1.5 flex items-center gap-2">
                      {p.title}
                      <Arrow className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-rose-soft" />
                    </h4>
                    <p className="text-white/50 text-xs font-light leading-relaxed">{p.desc}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[rgb(var(--surface)/0.95)] backdrop-blur-xl overflow-y-auto">
          <div className="flex flex-col px-5 pt-3 pb-10">
            {MEGA_MENU.map((m) => (
              <div key={m.label} className="border-b border-white/[0.08] py-1">
                <button
                  onClick={() => setMobilePanel((p) => (p === m.label ? null : m.label))}
                  className="w-full flex items-center justify-between px-1 py-3.5 font-display text-lg text-white"
                >
                  {m.label}
                  <svg className={`w-4 h-4 text-white/50 transition-transform duration-200 ${mobilePanel === m.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobilePanel === m.label && (
                  <div className="pb-3 pl-1 flex flex-col">
                    <a href={m.href} onClick={() => setMenuOpen(false)} className="block px-1 py-2.5 text-sm text-rose-soft font-medium">{m.label} overview</a>
                    {m.panel.map((p) => (
                      <a key={p.title} href={p.href} onClick={() => setMenuOpen(false)} className="block px-1 py-2.5 text-sm text-white/60 hover:text-white font-light">
                        {p.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href="/news" onClick={() => setMenuOpen(false)} className="px-1 py-4 font-display text-lg text-white border-b border-white/[0.08]">News &amp; Events</a>
            <a href="/contact" onClick={() => setMenuOpen(false)} className="px-1 py-4 font-display text-lg text-white border-b border-white/[0.08]">Contact</a>
            <div className="pt-6 flex flex-col gap-3" onClick={() => setMenuOpen(false)}>
              <BookButton className="w-full" />
              <GhostButton href="/contact#message" className="w-full">Send a message</GhostButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_HEADLINE = 'Engineering certainty in a complex world.'
const DEFAULT_SUBTEXT =
  'Datatrop is an intelligent systems engineering company. We design, build, and operate the systems that restore order wherever complexity prevents progress, whether the solution is known, unknown, or yet to be invented.'

// Split the headline so its closing words carry the brand glow
function splitHeadline(text) {
  const words = text.trim().split(/\s+/)
  if (words.length < 4) return [text, '']
  const tail = words.length > 5 ? 3 : 2
  return [words.slice(0, -tail).join(' '), words.slice(-tail).join(' ')]
}

function Hero({ headline, subtext }) {
  const [head, tail] = splitHeadline(headline || DEFAULT_HEADLINE)
  const s = subtext || DEFAULT_SUBTEXT

  return (
    <section id="home" className="relative lg:min-h-[100svh] flex flex-col overflow-hidden bg-[#070305]">
      {/* Earth network: right half on desktop, a panel under the copy on phones */}
      <div className="hidden lg:block absolute inset-y-0 right-0 w-[56%] anim-fade" style={{ animationDelay: '0.2s' }}>
        <Globe cx={0.52} cy={0.54} size={0.28} />
      </div>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_45%_60%_at_8%_20%,rgb(var(--grape-bright)/0.28),transparent_70%)]" />

      <div className={`relative z-10 ${WRAP} w-full flex-1 flex items-center pt-32 sm:pt-36 pb-10 lg:pb-16 pointer-events-none`}>
        <div className="max-w-[640px] pointer-events-auto">
          <Eyebrow className="mb-8 anim-fade text-white/70">Engineering impossibilities to reality</Eyebrow>

          <h1 className="font-display text-[44px] leading-[1.02] sm:text-7xl lg:text-[64px] xl:text-[72px] font-medium text-white tracking-[-0.045em] mb-8 anim-rise text-balance">
            {head} {tail && <span className="text-glow">{tail}</span>}
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-white/65 font-light leading-relaxed mb-11 anim-rise" style={{ animationDelay: '0.12s' }}>
            {s}
          </p>

          <div className="flex flex-col sm:flex-row gap-3.5 anim-rise" style={{ animationDelay: '0.22s' }}>
            <BookButton />
            <GhostButton href="#philosophy">Explore our approach</GhostButton>
          </div>
        </div>
      </div>
      <div className="lg:hidden relative h-[380px] sm:h-[460px] mb-6">
        <Globe size={0.3} />
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATEMENT — big editorial paragraph, revealed word by word as you scroll
// ═══════════════════════════════════════════════════════════════════════════════
const STATEMENT = 'Some problems don’t fit a product. Some ideas don’t have a blueprint yet.'
const STATEMENT_PAYOFF = 'That’s where we begin.'

const DEFAULT_ABOUT =
  'Datatrop AI Systems is an intelligent systems engineering company that designs, builds, and operates solutions for complex business and societal challenges. AI, automation, and software are not our identity; they are the delivery mechanisms we choose once we understand the problem.'

const PRINCIPLES = [
  'Engineered around the problem',
  'Systems over software',
  'Integration over isolation',
  'Measurable, lasting value',
]

// The everyday shapes of complexity, pinned over a real city at night.
// x is % across the photo; top labels hang down, bottom ones point up.
const WHO_LABELS = [
  { text: 'Supply chain disruptions', x: 9, top: true, len: 38 },
  { text: 'Manual processes', x: 27, top: true, len: 30, wide: true },
  { text: 'Data silos', x: 45, top: true, len: 44 },
  { text: 'Regulatory complexity', x: 15, top: false, len: 32 },
  { text: 'Unpredictable demand', x: 35, top: false, len: 40, wide: true },
  { text: 'Disconnected systems', x: 55, top: false, len: 30 },
]

// Pointer lines with captions laid over the Who we are photo. Top labels hang down; bottom labels point up. `wide` labels
// are hidden on phones to keep the photo readable.
function PhotoLabels({ labels, on }) {
  return labels.map((l, i) => (
    <div
      key={l.text}
      className={`absolute ${l.wide ? 'hidden sm:flex' : 'flex'} ${l.top ? 'top-[9%]' : 'bottom-[9%]'} flex-row items-stretch gap-3 transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-0'}`}
      style={{ left: `${l.x}%`, transitionDelay: `${300 + i * 120}ms` }}
    >
      <span className={`relative w-px bg-white/75 shadow-[0_0_4px_rgb(0_0_0/0.8)] ${l.top ? 'origin-top' : 'origin-bottom self-end'} transition-transform duration-700 ${on ? 'scale-y-100' : 'scale-y-0'}`} style={{ height: `${l.len * 4.5}px`, transitionDelay: `${450 + i * 120}ms` }}>
        <span className={`absolute left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full bg-white shadow-[0_0_10px_2px_rgb(255_255_255/0.6)] ${l.top ? 'bottom-0 translate-y-1/2' : 'top-0 -translate-y-1/2'}`} />
      </span>
      <span className={`font-mono text-[9px] sm:text-[11px] uppercase tracking-[0.2em] text-white max-w-[110px] sm:max-w-[150px] leading-snug [text-shadow:0_1px_8px_rgb(0_0_0/0.9)] ${l.top ? '' : 'self-end'}`}>{l.text}</span>
    </div>
  ))
}

function WhoWeAre() {
  const [ref, progress] = useScrollProgress()
  const [imgRef, inView] = useInView()
  const words = STATEMENT.split(' ')
  const lit = progress * (words.length + 3) * 1.1
  const payoff = lit > words.length + 1

  return (
    <section id="statement" ref={imgRef} className="relative overflow-hidden border-y border-white/[0.06]">
      {/* Photo spans the left of the band and fades into the page on the right */}
      <div className="relative lg:absolute lg:inset-y-0 lg:left-0 lg:w-[72%] h-[420px] sm:h-[480px] lg:h-auto">
        <img src={whoWeAreImg} alt="A highway curving into a city skyline at night" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-[45%_55%] who-img" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_3_5/0.45),transparent_30%,transparent_70%,rgb(7_3_5/0.55))]" />
        <PhotoLabels labels={WHO_LABELS} on={inView} />
      </div>

      <div className={`relative ${WRAP} lg:min-h-[max(620px,100svh)] flex items-center py-14 lg:py-24`}>
        <div className="w-full lg:w-[40%] lg:ml-auto">
          <Eyebrow className="mb-8">Who we are</Eyebrow>
          <p ref={ref} className="font-display text-[28px] sm:text-[36px] lg:text-[40px] leading-[1.18] tracking-[-0.025em] font-medium">
            {words.map((w, i) => (
              <span key={i} className={`transition-colors duration-500 ${i < lit ? 'text-white' : 'text-white/[0.16]'}`}>{w} </span>
            ))}
          </p>
          <p className={`mt-8 font-display text-[28px] sm:text-[36px] lg:text-[40px] leading-tight tracking-[-0.025em] font-medium transition-all duration-700 ${payoff ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
            <span className="text-glow">{STATEMENT_PAYOFF}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

// About page opener: the admin-editable bio + principles
function AboutIntro({ about }) {
  const [ref, inView] = useInView()
  return (
    <section id="who-we-are" className="glow-section scroll-mt-20 py-24 sm:py-32">
      <div ref={ref} className={`${WRAP} grid lg:grid-cols-12 gap-10 ${reveal(inView)}`}>
        <div className="lg:col-span-5">
          <Eyebrow className="mb-5">Who we are</Eyebrow>
          <h2 className="font-display text-[34px] sm:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.06]">
            Whenever complexity prevents progress, we build the system that <span className="text-glow">restores order.</span>
          </h2>
        </div>
        <div className="lg:col-span-7 lg:pt-14">
          <p className="text-white/75 text-lg font-light leading-relaxed mb-6">{about || DEFAULT_ABOUT}</p>
          <p className="text-white/55 font-light leading-relaxed mb-8">
            The market doesn't need to remember every service we offer. It needs to remember one thing: Datatrop exists
            to solve complex problems by designing intelligent systems that create stability, capability and long-term value.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {PRINCIPLES.map((p) => (
              <span key={p} className="text-[13px] px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/70">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS — pinned while you scroll; the diagram tells the story
// ═══════════════════════════════════════════════════════════════════════════════
const PHILOSOPHY = [
  { n: '01', name: 'Decipher', viz: 'decipher', caption: 'From noise', body: 'We investigate the real problem beneath the surface: people, processes, data and constraints.' },
  { n: '02', name: 'Derive', viz: 'derive', caption: 'To clarity', body: 'We connect the dots, identify patterns and opportunities, and determine what should exist.' },
  { n: '03', name: 'Datatrop', viz: 'datatrop', caption: 'To a working system', body: 'We engineer and operate the complete system, combining technology, people and processes to deliver real outcomes.' },
]

function Philosophy() {
  const [ref, inView] = useInView()
  return (
    <section id="philosophy" className="glow-section alt scroll-mt-20 py-24 sm:py-32 border-t border-white/[0.06]">
      <div className={WRAP} ref={ref}>
        <div className={`grid lg:grid-cols-12 gap-8 items-end mb-16 sm:mb-20 ${reveal(inView)}`}>
          <div className="lg:col-span-7">
            <Eyebrow className="mb-6">The Datatrop philosophy</Eyebrow>
            <h2 className="font-display text-[48px] sm:text-[68px] lg:text-[80px] font-medium tracking-[-0.045em] leading-[0.98]">
              <span className="block text-white">Decipher.</span>
              <span className="block text-white/55">Derive.</span>
              <span className="block text-glow">Datatrop.</span>
            </h2>
          </div>
          <p className="lg:col-span-5 text-white/65 text-lg sm:text-xl font-light leading-relaxed lg:pb-3">
            A disciplined approach to turn complexity into engineered systems.
          </p>
        </div>
        <ol className="grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
          {PHILOSOPHY.map((st, i) => (
            <li key={st.n} className={`relative flex flex-col ${reveal(inView)}`} style={{ transitionDelay: `${150 + i * 150}ms` }}>
              <div className="flex items-center gap-4 mb-5">
                <span className="w-11 h-11 rounded-full border border-[rgb(var(--accent)_/_0.6)] flex items-center justify-center font-mono text-[12px] text-white">{st.n}</span>
                <h3 className="font-mono text-[15px] uppercase tracking-[0.24em] text-rose-soft">{st.name}</h3>
              </div>
              <p className="text-white/60 font-light leading-relaxed md:min-h-[78px]">{st.body}</p>
              <div className="relative mt-8 aspect-[4/3] rounded-[1.25rem] overflow-hidden">
                <PhilosophyViz kind={st.viz} />
              </div>
              <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.26em] text-white/45">{st.caption}</p>
              {i < PHILOSOPHY.length - 1 && (
                <Arrow className="hidden md:block absolute -right-6 lg:-right-8 top-[58%] w-5 h-5 text-white/30" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const HOW_STEPS = [
  { label: 'Understand the challenge', desc: 'We sit with your team, map the operation and find what is really holding it back, not just the symptoms.' },
  { label: 'Derive what matters', desc: 'We turn what we learned into a clear definition of what the solution must achieve, and how we will measure it.' },
  { label: 'Architect the system', desc: 'We choose the right mix of technology, data, AI, process and people, and design how they fit together.' },
  { label: 'Build & deploy', desc: 'We engineer it, test it against real work and roll it out alongside your team, step by step.' },
  { label: 'Operate and evolve', desc: 'We run it, measure the results and keep improving it as your business grows.' },
]
const HOW_STEP_MS = 3200

function HowWeWork() {
  const [ref, inView] = useInView()
  const [active, setActive] = useState(-1)
  const [paused, setPaused] = useState(false)
  const n = HOW_STEPS.length

  // When the section arrives, run through the steps one by one, then keep cycling
  useEffect(() => {
    if (!inView || paused) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setActive((a) => (still && a >= 0 ? a : (a + 1) % n)), active < 0 ? 400 : HOW_STEP_MS)
    return () => clearTimeout(t)
  }, [inView, paused, active, n])

  const shown = Math.max(active, 0)
  const pick = (i) => { setActive(i); setPaused(true) }

  return (
    <section id="how-it-works" className="glow-section scroll-mt-20 py-20 sm:py-28 border-t border-white/[0.06]">
      <div className={WRAP} ref={ref}>
        <div className={`grid lg:grid-cols-12 gap-6 items-end mb-12 ${reveal(inView)}`}>
          <div className="lg:col-span-7">
            <Eyebrow className="mb-5">How we work</Eyebrow>
            <h2 className="font-display text-[34px] sm:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.05]">
              We start with your challenge, <span className="text-glow">not the technology.</span>
            </h2>
          </div>
          <p className="lg:col-span-5 text-white/60 text-base sm:text-lg font-light leading-relaxed">
            Every engagement follows the Datatrop philosophy, adapted to your problem and context.
          </p>
        </div>

        <div className="relative" onMouseLeave={() => setPaused(false)}>
          {/* Track and the glowing beam that runs along it (desktop) */}
          <div className="hidden lg:block absolute left-[5%] right-[5%] top-1/2 -translate-y-1/2 h-px bg-white/10" aria-hidden="true">
            <div
              className="h-full bg-[linear-gradient(90deg,#8A2A91,#E0457B)] shadow-[0_0_12px_2px_rgb(224_69_123/0.7)] transition-[width] duration-700 ease-out"
              style={{ width: `${active < 0 ? 0 : (shown / (n - 1)) * 100}%` }}
            />
          </div>
          <ol className="relative grid gap-3 lg:grid-cols-5 lg:gap-5">
            {HOW_STEPS.map((st, i) => {
              const on = i === shown && active >= 0
              const done = active >= 0 && i < shown
              return (
                <li key={st.label} className={`${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} transition-all duration-500`} style={{ transitionDelay: `${150 + i * 90}ms` }}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    onMouseEnter={() => pick(i)}
                    aria-pressed={on}
                    className={`w-full flex items-center gap-3.5 rounded-full border pl-2.5 pr-5 py-2.5 text-left transition-all duration-500 ${
                      on
                        ? 'border-rose bg-[linear-gradient(90deg,rgb(var(--grape-bright)/0.45),rgb(var(--maroon)/0.9))] shadow-[0_0_40px_-6px_rgb(224_69_123/0.7)] scale-[1.04]'
                        : done
                          ? 'border-[rgb(var(--accent)_/_0.45)] bg-[rgb(var(--surface))]'
                          : 'border-white/15 bg-[rgb(var(--surface))] hover:border-white/30'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-mono text-[11px] transition-colors duration-500 ${on ? 'bg-rose border-rose text-white' : done ? 'border-rose/60 text-rose-soft' : 'border-[rgb(var(--accent)_/_0.4)] text-white/70'}`}>
                      {done ? '✓' : String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[14px] leading-snug transition-colors duration-500 ${on ? 'text-white' : 'text-white/70'}`}>{st.label}</span>
                  </button>
                  {/* Phones: the explanation opens under the lit step */}
                  <p className={`lg:hidden overflow-hidden px-5 text-white/65 text-sm font-light leading-relaxed transition-all duration-500 ${on ? 'max-h-32 pt-3' : 'max-h-0'}`}>{st.desc}</p>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Desktop: the lit step's explanation, under the row */}
        <div className="hidden lg:flex items-start gap-6 mt-10 min-h-[64px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-rose-soft pt-1.5 whitespace-nowrap">Step {String(shown + 1).padStart(2, '0')}</span>
          <p key={shown} className={`max-w-3xl text-white/75 text-lg font-light leading-relaxed ${active >= 0 ? 'anim-fade' : 'opacity-0'}`}>{HOW_STEPS[shown].desc}</p>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIG 0.1–0.3 — how we engage, organized by problem type not technology
// ═══════════════════════════════════════════════════════════════════════════════
function FigBuild() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fb-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E0457B" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3A0B20" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <g key={i} className="fig-rise" style={{ animationDelay: `${i * 0.35}s` }}>
          <path
            d={`M160 ${48 + i * 38} L250 ${78 + i * 38} L160 ${108 + i * 38} L70 ${78 + i * 38} Z`}
            fill={i === 0 ? 'url(#fb-g)' : 'rgba(255,255,255,0.03)'}
            stroke={i === 0 ? '#F08DB0' : 'rgba(255,255,255,0.22)'}
            strokeWidth="1"
          />
        </g>
      ))}
      <line x1="70" y1="78" x2="70" y2="154" stroke="rgba(255,255,255,0.18)" className="fig-dash" />
      <line x1="250" y1="78" x2="250" y2="154" stroke="rgba(255,255,255,0.18)" className="fig-dash" />
      <circle cx="160" cy="78" r="3" fill="#fff" className="fig-pulse" />
    </svg>
  )
}

function FigSolve() {
  const nodes = [[52, 46], [96, 150], [36, 112], [268, 40], [282, 132], [226, 168], [140, 30]]
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" fill="none" aria-hidden="true">
      {nodes.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2="160" y2="100" stroke="rgba(240,141,176,0.45)" strokeWidth="1" className="fig-dash" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="rgba(255,255,255,0.65)" />
      ))}
      <circle cx="160" cy="100" r="26" fill="rgba(224,69,123,0.12)" stroke="rgba(224,69,123,0.5)" className="fig-pulse" />
      <circle cx="160" cy="100" r="7" fill="#F08DB0" />
    </svg>
  )
}

function FigInnovate() {
  return (
    <svg viewBox="0 0 320 200" className="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="fi-g">
          <stop offset="0" stopColor="#F08DB0" />
          <stop offset="0.5" stopColor="#8A2A91" stopOpacity="0.6" />
          <stop offset="1" stopColor="#8A2A91" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="100" r="48" fill="url(#fi-g)" className="fig-pulse" />
      <g className="fig-spin">
        <ellipse cx="160" cy="100" rx="128" ry="42" stroke="rgba(255,255,255,0.18)" />
        <circle cx="288" cy="100" r="4" fill="#fff" />
      </g>
      <g className="fig-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}>
        <ellipse cx="160" cy="100" rx="88" ry="76" stroke="rgba(240,141,176,0.35)" strokeDasharray="2 6" />
        <circle cx="160" cy="24" r="3" fill="#F08DB0" />
      </g>
    </svg>
  )
}

const PILLARS = [
  {
    fig: 'FIG 0.1',
    tag: 'Build',
    cta: 'Start a build engagement',
    Figure: FigBuild,
    when: 'When you know what you need.',
    title: 'Systems for businesses',
    desc: 'You have a clear vision but lack the engineering capability. We become your engineering partner: AI operating systems, automation, enterprise platforms, integration and intelligence systems. We’re not selling automation. We’re selling capability.',
  },
  {
    fig: 'FIG 0.2',
    tag: 'Solve',
    cta: 'Bring us a problem',
    Figure: FigSolve,
    when: 'When something is wrong, but not the answer.',
    title: 'Systems for unsolved problems',
    desc: 'You’re losing money, time or efficiency, but the solution isn’t obvious yet. We investigate, design, build and deploy. Not an implementation partner. A problem-solving organization.',
  },
  {
    fig: 'FIG 0.3',
    tag: 'Innovate',
    cta: 'Partner on a product',
    Figure: FigInnovate,
    when: 'When the world needs a new solution.',
    title: 'Products for the world',
    desc: 'We identify global problems ourselves, across healthcare, education, environment, transportation, climate, government, manufacturing and agriculture, and build products around them.',
  },
]

function ThreePillars() {
  const [ref, inView] = useInView()
  return (
    <section id="engage" className="glow-section alt py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead eyebrow="How we engage" title="Organized by problem, not by technology." inView={inView} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {PILLARS.map(({ fig, tag, cta, Figure, when, title, desc }, i) => (
            <article
              key={tag}
              className={`card card-hover overflow-hidden flex flex-col ${reveal(inView)}`}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="relative h-52 border-b border-white/[0.07] bg-[radial-gradient(ellipse_at_50%_100%,rgb(var(--maroon)/0.8),transparent_70%)]">
                <span className="absolute top-4 left-5 font-mono text-[10px] tracking-[0.2em] text-white/40">{fig}</span>
                <span className="absolute top-4 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-soft">{tag}</span>
                <div className="absolute inset-0 px-6 pt-8 pb-2"><Figure /></div>
              </div>
              <div className="p-7 flex flex-col flex-1">
                <p className="text-white/45 text-[13px] font-light italic mb-3">{when}</p>
                <h3 className="font-display text-white text-xl font-medium tracking-tight mb-3">{title}</h3>
                <p className="text-white/60 text-sm font-light leading-relaxed flex-1">{desc}</p>
                <a {...bookProps} className="group mt-7 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
                  {cta}
                  <Arrow className="w-4 h-4 transition-transform group-hover:translate-x-1 text-rose-soft" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI WORKFORCE — product-console mockup
// ═══════════════════════════════════════════════════════════════════════════════
function Avatar({ label, agent = false }) {
  return (
    <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold ${agent ? 'icon-tile' : 'bg-white/10 text-white/80'}`}>
      {label}
    </span>
  )
}

function Console() {
  const bars = [42, 55, 48, 63, 70, 82]
  return (
    <div className="card overflow-hidden text-left">
      {/* Window chrome */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07] bg-black/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
        </div>
        <span className="font-mono text-[11px] text-white/45"># operations</span>
        <span className="flex items-center gap-2 text-[11px] text-white/50">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-rose" /> 4 agents live
        </span>
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-5">
        <div className="flex gap-3">
          <Avatar label="IN" agent />
          <div className="min-w-0">
            <p className="text-[12px] text-white/45 mb-1"><span className="text-white/85 font-medium">Intake Agent</span> · 09:12</p>
            <p className="text-sm text-white/75 font-light leading-relaxed">38 purchase orders came in overnight. 35 matched to stock; 3 need a supplier check.</p>
            <span className="inline-block mt-2 text-[11px] px-2.5 py-1 rounded-full bg-rose/15 border border-rose/30 text-rose-soft">3 flagged for review</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Avatar label="FI" agent />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-white/45 mb-1"><span className="text-white/85 font-medium">Finance Agent</span> · 09:14</p>
            <p className="text-sm text-white/75 font-light leading-relaxed">Reconciled 312 invoices against bank statements. Two variances above threshold need your sign-off.</p>
            <div className="flex gap-2 mt-3">
              <span className="text-[12px] px-3.5 py-1.5 rounded-full btn-primary">Approve both</span>
              <span className="text-[12px] px-3.5 py-1.5 rounded-full border border-white/15 text-white/70">Review</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Avatar label="OL" />
          <div className="min-w-0">
            <p className="text-[12px] text-white/45 mb-1"><span className="text-white/85 font-medium">Operations Lead</span> · 09:20</p>
            <p className="text-sm text-white/75 font-light leading-relaxed">Approved. What does raw material demand look like next month?</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Avatar label="DT" agent />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-white/45 mb-2"><span className="text-white/85 font-medium">Planning Agent</span> · 09:20</p>
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-[12px] text-white/55">Forecast demand · next 6 weeks</span>
                <span className="text-[12px] text-rose-soft">+18%</span>
              </div>
              <div className="flex items-end gap-2 h-16">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i >= 4 ? 'linear-gradient(180deg,#E0457B,#6B1E72)' : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-sm text-white/35 font-light flex-1">Ask your system anything…</span>
          <span className="typing flex gap-1">
            <span className="w-1 h-1 rounded-full bg-white/60" /><span className="w-1 h-1 rounded-full bg-white/60" /><span className="w-1 h-1 rounded-full bg-white/60" />
          </span>
        </div>
      </div>
    </div>
  )
}

function Workforce() {
  const [ref, inView] = useInView()
  return (
    <section id="workforce" className="glow-section py-28 sm:py-36">
      <div className={`${WRAP} grid lg:grid-cols-2 gap-14 lg:gap-20 items-center`} ref={ref}>
        <div className={reveal(inView)}>
          <Eyebrow className="mb-5">AI workforce platforms</Eyebrow>
          <h2 className="font-display text-[34px] sm:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.06] mb-6">
            Systems that work alongside your team.
          </h2>
          <p className="text-white/60 text-lg font-light leading-relaxed mb-5">
            Multi-agent systems take on the repetitive operational work: intake, reconciliation, follow-ups, reporting.
            Your people handle the decisions that matter.
          </p>
          <p className="text-white/60 font-light leading-relaxed mb-9">
            Nothing runs as a black box. Every system is designed, deployed and maintained by our engineers, and
            approvals and exceptions reach your team wherever it already works.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-10">
            {['Human approval on critical steps', 'Connects to your existing tools', 'Full audit trail of every action', 'Engineered and supported end to end'].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/75">
                <svg className="w-4 h-4 mt-0.5 text-rose-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <BookButton>See it on your workflows</BookButton>
        </div>
        <div className={`relative ${reveal(inView)}`} style={{ transitionDelay: '120ms' }}>
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_60%_40%,rgb(var(--grape-bright)/0.35),transparent_60%)] pointer-events-none" />
          <div className="relative rounded-[1.25rem]"><Console /></div>
          <p className="relative mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">Illustrative interface</p>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHAT WE BUILD  (Capabilities — DB-backed service lines, no pricing)
// ═══════════════════════════════════════════════════════════════════════════════
const CAP_ICONS = [
  'M12 3l8.66 5v8L12 21l-8.66-5V8L12 3zm0 0v18M3.34 8L12 13l8.66-5',
  'M12 4.5a2.5 2.5 0 013 2.45M12 4.5A2.5 2.5 0 009 6.95M12 4.5V3m6 8a2.5 2.5 0 01-.05 3M18 11a2.5 2.5 0 00-2.45-3M18 11h1.5M6 11a2.5 2.5 0 00-.05 3M6 11a2.5 2.5 0 012.45-3M6 11H4.5m4.5 6.05A2.5 2.5 0 0012 19.5a2.5 2.5 0 003-2.45M9 17.05V18.5',
  'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z',
  'M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z',
]

const DEFAULT_SERVICE_LINES = [
  { id: 's1', name: 'Enterprise AI Systems', examples: 'Unified operating platforms that connect every department into one intelligent system.' },
  { id: 's2', name: 'AI Workforce Platforms', examples: 'Multi-agent teams that execute operational work autonomously.' },
  { id: 's3', name: 'Revenue Intelligence Systems', examples: 'Lead intelligence, sales automation, and conversion optimization.' },
  { id: 's4', name: 'Communication Intelligence Platforms', examples: 'Omnichannel communication with call and conversation intelligence.' },
  { id: 's5', name: 'AI Product Development', examples: 'AI-native products and industry platforms, engineered end-to-end.' },
]

function CapIcon({ i, className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d={CAP_ICONS[i % CAP_ICONS.length]} />
    </svg>
  )
}

function WhatWeBuild({ serviceLines }) {
  const [ref, inView] = useInView()
  const lead = serviceLines[0]
  const rest = serviceLines.slice(1)
  return (
    <section id="capabilities" className="glow-section alt scroll-mt-20 py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="Capabilities"
          title="What we build."
          intro="Five system categories, each engineered around how your organization actually operates."
          inView={inView}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {lead && (
            <div className={`md:col-span-2 relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-brand-gradient grid lg:grid-cols-2 items-center gap-6 p-8 sm:p-10 ${reveal(inView)}`}>
              <Arcs variant="card" className="opacity-60" />
              <div className="relative order-2 lg:order-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-soft">Flagship</span>
                <h3 className="font-display text-white text-2xl sm:text-3xl font-medium tracking-tight mt-3 mb-3">{lead.name}</h3>
                <p className="text-white/70 text-base font-light leading-relaxed max-w-md mb-7">{lead.examples}</p>
                <a {...bookProps} className="btn-secondary px-6 py-3.5">Talk to an engineer <Arrow /></a>
              </div>
              <div className="relative order-1 lg:order-2 aspect-[440/232] w-full">
                {capabilityKind(lead.name)
                  ? <CapabilityViz kind={capabilityKind(lead.name)} />
                  : <div className="icon-tile w-14 h-14"><CapIcon i={0} /></div>}
              </div>
            </div>
          )}
          {rest.map((s, i) => {
            const kind = capabilityKind(s.name)
            return (
              <div
                key={s.id}
                className={`card card-hover overflow-hidden flex flex-col ${reveal(inView)}`}
                style={{ transitionDelay: `${(i + 1) * 80}ms` }}
              >
                <div className="h-44 px-6 pt-6 pb-3 border-b border-white/[0.07] bg-[radial-gradient(ellipse_at_50%_100%,rgb(var(--maroon)/0.7),transparent_70%)] flex items-center">
                  {kind ? <CapabilityViz kind={kind} /> : <div className="icon-tile w-12 h-12 mx-auto"><CapIcon i={i + 1} /></div>}
                </div>
                <div className="p-7">
                  <h3 className="font-display text-white text-lg font-medium tracking-tight mb-2">{s.name}</h3>
                  <p className="text-white/55 text-sm font-light leading-relaxed">{s.examples}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE COMPLEXITY SCALE — the brand-board gradient bar, five levels
// ═══════════════════════════════════════════════════════════════════════════════
const APPROACH = [
  { step: 'Automation', desc: 'Eliminate repetitive tasks.' },
  { step: 'Integration', desc: 'Connect disconnected systems.' },
  { step: 'Intelligence', desc: 'Enable AI-driven decisions.' },
  { step: 'Business Systems', desc: 'Reimagine how organizations operate.' },
  { step: 'Innovation', desc: 'Create new products for emerging global challenges.' },
]

function Approach() {
  const [ref, inView] = useInView()
  return (
    <section id="approach" className="glow-section py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="The complexity scale"
          title="Wherever your problem falls, we can engage."
          intro="From eliminating a repetitive task to inventing a product that doesn't exist yet, this is the range we operate across."
          inView={inView}
        />

        {/* Desktop: gradient bar with pins */}
        <div className="hidden md:block">
          <div
            className={`h-20 rounded-2xl border border-white/10 origin-left transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${inView ? 'scale-x-100' : 'scale-x-0'}`}
            style={{ background: 'linear-gradient(90deg, #8A2A91 0%, #6B1E72 18%, #54133F 40%, #3A0B20 62%, #1B050D 82%, #070305 100%)' }}
          />
          <div className="grid grid-cols-5">
            {APPROACH.map((a, i) => (
              <div
                key={a.step}
                className={`relative pt-12 pr-6 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${600 + i * 120}ms` }}
              >
                <span className="absolute left-0 -top-3 flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgb(var(--accent))]" />
                  <span className="w-px h-9 bg-white/50" />
                </span>
                <p className="font-mono text-[12px] text-white/90 mb-1">L{i + 1}</p>
                <h3 className="font-display text-white text-lg font-medium tracking-tight mb-1.5">{a.step}</h3>
                <p className="text-white/50 text-sm font-light leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical scale */}
        <ol className="md:hidden relative pl-8">
          <span className="absolute left-[5px] top-2 bottom-2 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, #8A2A91, #54133F 45%, #1B050D)' }} />
          {APPROACH.map((a, i) => (
            <li key={a.step} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgb(var(--accent))]" />
              <p className="font-mono text-[12px] text-white/70 mb-1">L{i + 1}</p>
              <h3 className="font-display text-white text-lg font-medium mb-1">{a.step}</h3>
              <p className="text-white/55 text-sm font-light">{a.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHAT WE SOLVE  (DB-backed problems, row list)
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_PROBLEMS = [
  { id: 'p1', title: 'Fragmented Operations', symptoms: 'Excel everywhere, data duplication, manual handoffs, no visibility.', solution: 'Disconnected systems become one intelligent operating platform.', reference_case: 'Unified Operations Systems, covering sales, procurement, inventory, dispatch, finance, accounting and HR in one platform.' },
  { id: 'p2', title: 'Revenue Leakage', symptoms: 'Missed leads, poor follow-up, lost opportunities, low conversion.', solution: 'Capture every opportunity with AI-driven sales intelligence.' },
  { id: 'p3', title: 'Communication Chaos', symptoms: 'Calls on personal phones, no visibility, lost customers, no accountability.', solution: 'Unify calls, messages, and customer interactions into one intelligent communication layer.', reference_case: 'Automotive communication system with centralized IVR, CRM tracking, dashboards and AI call intelligence.' },
  { id: 'p4', title: 'Organizational Intelligence', symptoms: 'Knowledge trapped in employees, decisions depend on individuals, no institutional memory.', solution: 'Turn scattered knowledge into permanent institutional memory.' },
  { id: 'p5', title: 'Human Dependency', symptoms: 'Repetitive work, hiring challenges, process bottlenecks.', solution: 'Deploy AI workforces that execute repetitive work while humans focus on strategy.', reference_case: 'AI Voice Ecosystems capable of autonomous customer interactions with memory and specialized capabilities.' },
]

function WhatWeSolve({ problems }) {
  const [ref, inView] = useInView()
  const [active, setActive] = useState(0)
  const [after, setAfter] = useState(false)
  const [auto, setAuto] = useState(true)
  const p = problems[Math.min(active, problems.length - 1)]

  // Flip between before and after on its own until the visitor takes over
  useEffect(() => {
    if (!inView || !auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setAfter((v) => !v), 3600)
    return () => clearInterval(t)
  }, [inView, auto, active])

  const pick = (i) => { setActive(i); setAfter(false) }
  const before = p.symptoms || ''
  const afterText = p.solution || p.description || ''

  return (
    <section id="solve" className="glow-section scroll-mt-20 py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="Problems we solve"
          title="See the difference, not just the description."
          intro="Pick a problem, then flip between how it looks today and how it looks once the system is in place."
          inView={inView}
        />
        <div className={`grid lg:grid-cols-12 gap-6 lg:gap-10 ${reveal(inView)}`}>
          {/* Problem picker */}
          <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0 pb-2 lg:pb-0" role="tablist" aria-label="Problems">
            {problems.map((q, i) => (
              <button
                key={q.id}
                role="tab"
                aria-selected={i === active}
                onClick={() => pick(i)}
                className={`flex-shrink-0 text-left flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all ${
                  i === active ? 'border-[rgb(var(--accent)_/_0.55)] bg-[rgb(var(--maroon)_/_0.55)] text-white' : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <span className={`font-mono text-xs tabular-nums ${i === active ? 'text-rose-soft' : 'text-white/35'}`}>{String(i + 1).padStart(2, '0')}</span>
                <span className="font-display text-[15px] sm:text-base font-medium whitespace-nowrap lg:whitespace-normal">{q.title}</span>
              </button>
            ))}
          </div>

          {/* Scene */}
          <div className="lg:col-span-8 card overflow-hidden" role="tabpanel" aria-label={p.title}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
              <h3 className="font-display text-white text-xl sm:text-2xl font-medium tracking-tight">{p.title}</h3>
              <div className="relative inline-flex rounded-full border border-white/10 bg-black/30 p-1 text-[13px]" role="group" aria-label="Before or after">
                <span className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 ${after ? 'left-[calc(50%+0px)] bg-[linear-gradient(90deg,#8A2A91,#E0457B)]' : 'left-1 bg-[rgba(246,196,83,0.22)]'}`} />
                <button type="button" onClick={() => { setAuto(false); setAfter(false) }} aria-pressed={!after} className={`relative px-4 py-1.5 rounded-full transition-colors ${!after ? 'text-white' : 'text-white/55'}`}>Before</button>
                <button type="button" onClick={() => { setAuto(false); setAfter(true) }} aria-pressed={after} className={`relative px-4 py-1.5 rounded-full transition-colors ${after ? 'text-white' : 'text-white/55'}`}>After</button>
              </div>
            </div>
            <div className="px-4 sm:px-8 pt-4">
              <ProblemScene kind={problemKind(p.title)} after={after} label={`${p.title}: ${after ? afterText : before}`} />
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-white/[0.06] border-t border-white/[0.07]">
              <div className={`bg-[rgb(var(--surface))] p-5 transition-opacity duration-500 ${after ? 'opacity-50' : 'opacity-100'}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F6C453] mb-2">Today</p>
                <p className="text-white/70 text-sm font-light leading-relaxed">{before}</p>
              </div>
              <div className={`bg-[rgb(var(--surface))] p-5 transition-opacity duration-500 ${after ? 'opacity-100' : 'opacity-50'}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-soft mb-2">With Datatrop</p>
                <p className="text-white/80 text-sm font-light leading-relaxed">{afterText}</p>
              </div>
            </div>
            {p.reference_case && (
              <div className="flex items-start gap-3 px-5 py-4 border-t border-white/[0.07] bg-[rgb(var(--maroon)_/_0.35)]">
                <span className="mt-0.5 flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-soft">Built</span>
                <p className="text-white/75 text-sm leading-relaxed">{p.reference_case}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRIES — breadth without claiming false depth in every domain
// ═══════════════════════════════════════════════════════════════════════════════
const INDUSTRIES = [
  'Manufacturing', 'Logistics', 'Healthcare', 'Financial Services', 'Retail', 'Government',
  'Energy', 'Construction', 'Education', 'Maritime', 'Environment', 'Smart Cities',
  'Transportation', 'Aerospace', 'Agriculture',
]

function Industries() {
  const [ref, inView] = useInView()
  return (
    <section id="all-industries" className="glow-section scroll-mt-20 py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="Also engaging across"
          title="Wherever complexity slows progress."
          intro="The industries above are where we're most often asked to help. The pattern repeats everywhere: fragmented systems, manual work and slow decisions."
          inView={inView}
          center
        />
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {INDUSTRIES.map((ind, i) => (
            <span
              key={ind}
              className={`px-5 py-3 rounded-full border border-white/10 bg-white/[0.03] text-white/75 text-sm hover:border-rose/40 hover:bg-[rgb(var(--maroon)/0.4)] hover:text-white transition-all duration-500 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {ind}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BY THE NUMBERS + PHILOSOPHY
// ═══════════════════════════════════════════════════════════════════════════════
const STATS = [
  { num: 5, max: 5, suffix: '+', kind: 'segments', label: 'System categories engineered' },
  { num: 8, max: 8, kind: 'dots', label: 'Industries served' },
  { num: 24, max: 24, display: '24/7', kind: 'clock', label: 'Autonomous execution' },
  { num: 100, max: 100, suffix: '%', kind: 'ring', label: 'Built around the problem' },
]

function WhyDatatrop() {
  const [ref, inView] = useInView()
  return (
    <section id="why" className="glow-section alt py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <div className={`grid lg:grid-cols-12 gap-10 mb-16 ${reveal(inView)}`}>
          <div className="lg:col-span-7">
            <Eyebrow className="mb-5">Our philosophy</Eyebrow>
            <h2 className="font-display text-[34px] sm:text-5xl lg:text-[56px] font-medium text-white tracking-[-0.03em] leading-[1.04]">
              Complexity is inevitable. <span className="text-glow">Chaos is optional.</span>
            </h2>
          </div>
          <p className="lg:col-span-5 lg:pt-12 text-white/60 text-lg font-light leading-relaxed">
            Every complex problem can be understood, engineered, and transformed into a stable system. Our mission is to
            eliminate complexity, restore stability, and solve meaningful problems for businesses, industries and
            society, whatever technology that requires.
          </p>
        </div>
        <StatTiles stats={STATS} />
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI SHOWCASE + CLIENTS (dynamic — render only when admin has added entries)
// ═══════════════════════════════════════════════════════════════════════════════
function Showcase({ items }) {
  const [ref, inView] = useInView()
  return (
    <section className="glow-section py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead eyebrow="Systems in the field" title="Intelligence we've shipped." inView={inView} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <div key={item.id} className={`card card-hover p-7 flex flex-col ${reveal(inView)}`} style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/35 mb-5">FIG {String(i + 1).padStart(2, '0')}</span>
              <h3 className="font-display text-white text-lg font-medium tracking-tight mb-2">{item.title}</h3>
              {item.description && <p className="text-white/55 text-sm font-light leading-relaxed mb-5 flex-1">{item.description}</p>}
              {(Array.isArray(item.tags) ? item.tags : []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-white/55">{t}</span>
                  ))}
                </div>
              )}
              {item.demo_url && (
                <a href={item.demo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-rose-soft hover:text-white text-sm">View demo <Arrow className="w-3.5 h-3.5" /></a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Clients({ customers }) {
  const [ref, inView] = useInView()
  return (
    <section className="glow-section alt py-24">
      <div className={WRAP} ref={ref}>
        <SectionHead eyebrow="Clients" title="Who we work with." inView={inView} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px rounded-[1.25rem] overflow-hidden border border-white/[0.08] bg-white/[0.08]">
          {customers.map((c, i) => (
            <div key={c.id} className={`bg-[rgb(var(--surface))] p-6 transition-all duration-500 ${inView ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${i * 50}ms` }}>
              <p className="font-display text-white text-sm font-medium">{c.name}</p>
              {c.company && <p className="text-white/45 text-xs mt-1 font-light">{c.company}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FEEDBACK (dynamic — only renders when admin has added testimonials)
// ═══════════════════════════════════════════════════════════════════════════════
// Google "G" mark, used to attribute reviews sourced from Google
function GoogleG({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 01-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55z" />
      <path fill="#34A853" d="M12 24c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A11.5 11.5 0 0012 24z" />
      <path fill="#FBBC05" d="M5.55 14.67a6.9 6.9 0 010-4.41V7.28H1.7a11.5 11.5 0 000 10.37l3.85-2.98z" />
      <path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.5 0 3.6 2.58 1.7 6.34l3.85 2.98C6.46 6.77 9 4.75 12 4.75z" />
    </svg>
  )
}

function Stars({ value, className = 'w-4 h-4' }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, s) => (
        <svg key={s} className={`${className} ${s < value ? 'text-[#F6C453]' : 'text-white/15'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.33 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.95z" />
        </svg>
      ))}
    </div>
  )
}

// The approval preview has no backend, so it carries a copy of the published
// testimonials. The real site always reads them from Admin → Testimonials.
const PREVIEW_TESTIMONIALS = [
  {
    id: 'g1',
    rating: 5,
    source: 'Google',
    name: 'Max Mooijenkind',
    role: 'Customer Success Manager',
    company: 'Flexxvoice',
    quote: 'We’ve had a great experience working with Datatrop AI Systems. At the start, we didn’t have a fully clear idea of what we wanted—just a rough concept. However, as soon as we shared this, the team immediately understood our vision and translated it into exactly what we needed. Within just two days, everything was set up and ready to go. The gamification solution they built works perfectly and has been received very positively by our team on the floor. It’s something we definitely should have implemented much earlier. For any future projects, Datatrop AI Systems will absolutely be one of the first companies we reach out to.',
  },
]
const SHOW_PREVIEW_TESTIMONIALS = import.meta.env.VITE_PREVIEW_TESTIMONIALS === 'true'

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '•'
}

const AUTOPLAY_MS = 5500

function Testimonials({ items, reviewsUrl }) {
  const [ref, inView] = useInView()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)
  const n = items.length
  // The coverflow needs a card on each side of the centre one, so with only
  // two reviews the ring cycles through them twice.
  const ring = n === 2 ? [...items, ...items] : items
  const m = ring.length
  const rated = items.filter((t) => Number(t.rating) > 0)
  const avg = rated.length ? (rated.reduce((a, t) => a + Number(t.rating), 0) / rated.length).toFixed(1) : null

  const go = (d) => setActive((i) => (i + d + m) % m)

  // Autoplay; stops on hover/focus and for reduced-motion users
  useEffect(() => {
    if (n < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setActive((i) => (i + 1) % m), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [n, m, paused, active])

  // Position of each card relative to the active one: -1 left, 0 centre, 1 right
  const offsetOf = (i) => {
    let d = i - active
    if (d > m / 2) d -= m
    if (d < -m / 2) d += m
    return d
  }

  const arrowClass = 'w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-[rgb(var(--accent)_/_0.45)] bg-[rgb(var(--ink)_/_0.6)] backdrop-blur text-white flex items-center justify-center hover:border-rose hover:bg-[rgb(var(--maroon)_/_0.6)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose'

  return (
    <section id="testimonials" className="glow-section py-28 sm:py-36 overflow-hidden">
      <div className={WRAP} ref={ref}>
        {/* Heading */}
        <div className={`text-center max-w-3xl mx-auto mb-14 ${reveal(inView)}`}>
          <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-[rgb(var(--accent)_/_0.35)] bg-[rgb(var(--maroon)_/_0.35)] text-white text-[12px] font-medium uppercase tracking-[0.24em] mb-8">
            <svg className="w-4 h-4 text-rose-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z" /></svg>
            Testimonials
          </span>
          <h2 className="font-display text-[38px] sm:text-6xl lg:text-[68px] font-semibold text-white tracking-[-0.035em] leading-[1.02]">
            What our <span className="relative inline-block text-glow">clients
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-[3px] w-[140%] rounded-full bg-[radial-gradient(closest-side,rgb(var(--accent)),rgb(var(--grape-bright)/0.6),transparent)]" />
            </span> say
          </h2>
          <p className="mt-8 text-white/65 text-lg font-light">In their words, from the teams we've solved problems for.</p>
          {avg && (
            <div className="mt-6 inline-flex items-center gap-3 text-sm">
              <GoogleG className="w-4 h-4" />
              <span className="font-display text-white text-lg">{avg}</span>
              <Stars value={Math.round(avg)} />
              <span className="text-white/45 font-light">from {rated.length} review{rated.length === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>

        {/* Carousel */}
        <div
          className={`relative ${reveal(inView)}`}
          style={{ transitionDelay: '120ms' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (n > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
            touchX.current = null
          }}
          aria-roledescription="carousel"
          aria-label="Client testimonials"
        >
          <div className="grid [perspective:1800px] py-8" style={{ gridTemplateAreas: '"stack"', gridTemplateColumns: 'minmax(0, 1fr)' }}>
            {ring.map((t, i) => {
              const d = offsetOf(i)
              const isCenter = d === 0
              const side = Math.abs(d) === 1
              // Side cards swing in towards the centre, like pages of a book
              const transform = isCenter
                ? 'translateX(0) translateZ(0) rotateY(0deg) scale(1)'
                : side
                  ? `translateX(${d * 80}%) translateZ(-120px) rotateY(${-d * 22}deg) scale(0.86)`
                  : `translateX(${Math.sign(d) * 170}%) translateZ(-260px) rotateY(${-Math.sign(d) * 30}deg) scale(0.7)`
              return (
                <figure
                  key={i}
                  style={{ gridArea: 'stack', transform, zIndex: isCenter ? 3 : side ? 2 : 1 }}
                  aria-hidden={!isCenter}
                  onClick={() => !isCenter && setActive(i)}
                  className={`justify-self-center ${n === 1 ? 'w-full sm:w-[min(760px,86%)]' : 'w-[min(520px,92%)] sm:w-[min(520px,58%)] lg:w-[min(520px,38%)]'} transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCenter ? 'opacity-100' : side ? 'opacity-70 hidden sm:block cursor-pointer hover:opacity-90' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Gentle float so the stack never sits completely still */}
                  <div
                    className={`testimonial-float h-full flex flex-col rounded-[1.75rem] p-8 sm:p-10 transition-[box-shadow,border-color,background] duration-700 ${
                      isCenter
                        ? 'border-[1.5px] border-[rgb(var(--accent)_/_0.8)] bg-[rgb(var(--surface))] bg-[linear-gradient(165deg,rgb(var(--grape-bright)/0.3),rgb(var(--maroon)/0.55)_55%,rgb(var(--ink)/0.92))] shadow-[0_0_0_1px_rgb(var(--accent)/0.15),0_0_80px_-8px_rgb(var(--accent)/0.5),0_40px_80px_-40px_rgb(0_0_0/0.9)]'
                        : 'border border-white/10 bg-[linear-gradient(165deg,rgb(var(--deep-grape)/0.5),rgb(var(--dark-maroon)/0.88))] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]'
                    }`}
                    style={{ animationDelay: `${(i % 3) * -2.3}s` }}
                  >
                    <div className="flex items-start justify-between mb-7">
                      <span className="font-display text-6xl leading-[0.6] text-rose select-none" aria-hidden="true">”</span>
                      {Number(t.rating) > 0 && <Stars value={Number(t.rating)} className="w-5 h-5" />}
                    </div>
                    <blockquote className={`flex-1 font-light leading-relaxed ${isCenter ? 'text-white text-lg sm:text-xl' : 'text-white/80 text-base sm:text-lg line-clamp-[9]'}`}>
                      {t.quote}
                    </blockquote>
                    <figcaption className="mt-9 pt-6 border-t border-white/10 flex items-center gap-4">
                      <span className="flex-shrink-0 w-14 h-14 rounded-full p-[2px] bg-[linear-gradient(135deg,rgb(var(--accent)),rgb(var(--grape-bright)))]">
                        <span className="w-full h-full rounded-full bg-[rgb(var(--dark-maroon))] flex items-center justify-center font-display text-white text-sm font-semibold">{initials(t.name)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-white text-lg font-medium truncate">{t.name}</div>
                        {(t.role || t.company) && (
                          <div className="text-white/50 text-sm font-light leading-snug">{[t.role, t.company].filter(Boolean).join(' · ')}</div>
                        )}
                      </div>
                      {t.source === 'Google' && (
                        <span className="flex items-center gap-1.5 text-white/45 text-[11px] flex-shrink-0" title="Review from Google"><GoogleG /> Google</span>
                      )}
                    </figcaption>
                  </div>
                </figure>
              )
            })}
          </div>

          {n > 1 && (
            <>
              {/* Side arrows on larger screens */}
              <button onClick={() => go(-1)} aria-label="Previous testimonial" className={`${arrowClass} hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10`}>
                <Arrow className="w-5 h-5 rotate-180" />
              </button>
              <button onClick={() => go(1)} aria-label="Next testimonial" className={`${arrowClass} hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10`}>
                <Arrow className="w-5 h-5" />
              </button>

              <div className="mt-8 flex items-center justify-center gap-6">
                <button onClick={() => go(-1)} aria-label="Previous testimonial" className={`${arrowClass} lg:hidden`}>
                  <Arrow className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-center gap-2">
                  {items.map((t, i) => {
                    const current = active % n === i
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActive(i)}
                        aria-label={`Show testimonial ${i + 1}`}
                        aria-current={current}
                        className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-500 ${current ? 'w-10 bg-white/20' : 'w-1.5 bg-white/25 hover:bg-white/50'}`}
                      >
                        {/* The active dot fills up until the next card turns in */}
                        {current && (
                          <span
                            key={active}
                            className={`absolute inset-y-0 left-0 bg-rose rounded-full ${paused ? 'w-full' : 'testimonial-timer'}`}
                            style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => go(1)} aria-label="Next testimonial" className={`${arrowClass} lg:hidden`}>
                  <Arrow className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {reviewsUrl && (
          <div className="text-center mt-12">
            <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-6 py-3.5">
              <GoogleG className="w-4 h-4" />
              Read all reviews on Google
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISION + FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════════
function FinalCta({ vision = false }) {
  const [ref, inView] = useInView()
  return (
    <section className="py-12 sm:py-20">
      <div className={WRAP} ref={ref}>
        <div className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#070305] ${reveal(inView)}`}>
          <img src={ctaRoadImg} alt="" loading="lazy" className="absolute inset-y-0 right-0 w-full lg:w-[62%] h-full object-cover object-[50%_62%] cta-img" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070305_0%,rgb(7_3_5/0.85)_40%,rgb(7_3_5/0.2)_100%)] lg:bg-[linear-gradient(90deg,#070305_30%,rgb(7_3_5/0.4)_65%,transparent)]" />
          <div className="relative grid lg:grid-cols-12 gap-10 items-end px-6 py-16 sm:px-14 sm:py-20">
            <div className="lg:col-span-7">
              {vision && (
                <p className="font-display text-xl sm:text-2xl text-white/75 font-light leading-snug tracking-tight mb-12 max-w-2xl">
                  Our vision: to become the world's most trusted systems engineering company for solving complex challenges through
                  <span className="text-white font-normal"> intelligence, engineering, and innovation.</span>
                </p>
              )}
              <Eyebrow className="mb-6 text-white/70">Ready to Datatrop?</Eyebrow>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-medium text-white tracking-[-0.04em] leading-[1.04]">
                Have a problem that doesn't fit a product? <span className="text-glow">Let's engineer the answer.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-white/70 text-base sm:text-lg font-light leading-relaxed mb-8 max-w-md">
                Whether the solution is known, unknown, or yet to be invented, we can help you turn complexity into a working system.
              </p>
              <div className="flex flex-col sm:flex-row gap-3.5">
                <BookButton />
                <GhostButton href="/contact#message">Send a message</GhostButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS & EVENTS — posts managed in Admin → News & Events
// ═══════════════════════════════════════════════════════════════════════════════
const parseDay = (d) => { const [y, m, day] = String(d || '').slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, day || 1) }
const fmtDay = (d) => parseDay(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const isUpcoming = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); return parseDay(d) >= t }

function PostMeta({ post }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
      <span className="px-2.5 py-1 rounded-full border border-[rgb(var(--accent)_/_0.45)] text-rose-soft">{post.kind}</span>
      <span>{fmtDay(post.event_date)}</span>
      {post.location && <span className="normal-case tracking-normal font-sans text-[12px] text-white/50">· {post.location}</span>}
    </div>
  )
}

function PostImage({ post, className = '' }) {
  return post.image_url
    ? <img src={post.image_url} alt="" loading="lazy" className={`w-full h-full object-cover ${className}`} />
    : (
      <div className={`relative w-full h-full bg-brand-gradient overflow-hidden ${className}`}>
        <Arcs className="opacity-50" />
        <span className="absolute bottom-4 left-5 font-display text-white/80 text-2xl tracking-tight">{post.kind}</span>
      </div>
    )
}

function PostModal({ post, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  const paragraphs = (post.body || post.summary || '').split(/\n\s*\n/).filter((t) => t.trim())
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={post.title}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <article className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[rgb(var(--surface))] shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] anim-rise">
        <div className="relative aspect-[16/9]"><PostImage post={post} /></div>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:border-rose">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-7 sm:p-10">
          <PostMeta post={post} />
          <h2 className="mt-5 font-display text-white text-3xl sm:text-4xl font-medium tracking-[-0.03em] leading-tight">{post.title}</h2>
          <div className="mt-6 flex flex-col gap-4 text-white/70 font-light leading-relaxed">
            {paragraphs.map((t, i) => <p key={i} className="whitespace-pre-line">{t.trim()}</p>)}
          </div>
          {post.link_url && (
            <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-8 px-6 py-3.5">
              {post.link_label || 'Read more'} <Arrow />
            </a>
          )}
        </div>
      </article>
    </div>
  )
}

function PostCard({ post, onOpen, i, inView, featured = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className={`group card card-hover overflow-hidden text-left flex ${featured ? 'flex-col lg:flex-row' : 'flex-col'} ${reveal(inView)}`}
      style={{ transitionDelay: `${i * 90}ms` }}
    >
      <div className={`relative overflow-hidden ${featured ? 'aspect-[16/9] lg:aspect-auto lg:w-[55%] lg:min-h-[340px]' : 'aspect-[16/10]'}`}>
        <PostImage post={post} className="transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className={`flex flex-col flex-1 ${featured ? 'p-8 sm:p-10 justify-center' : 'p-6'}`}>
        <PostMeta post={post} />
        <h3 className={`mt-4 font-display text-white font-medium tracking-tight leading-snug ${featured ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>{post.title}</h3>
        {post.summary && <p className={`mt-3 text-white/55 font-light leading-relaxed ${featured ? 'text-base' : 'text-sm line-clamp-3'}`}>{post.summary}</p>}
        <span className="mt-6 inline-flex items-center gap-2 text-sm text-white">
          Read more <Arrow className="w-4 h-4 text-rose-soft transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  )
}

function NewsList({ posts, linkedin }) {
  const [ref, inView] = useInView()
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  const upcoming = (posts || []).filter((p) => isUpcoming(p.event_date)).sort((a, b) => parseDay(a.event_date) - parseDay(b.event_date))
  const past = (posts || []).filter((p) => !isUpcoming(p.event_date))

  return (
    <section className="glow-section py-20 sm:py-28">
      <div className={WRAP} ref={ref}>
        {posts === null ? (
          <p className="text-white/40 text-sm animate-pulse">Loading…</p>
        ) : posts.length === 0 ? (
          <div className={`card p-10 sm:p-14 text-center max-w-2xl mx-auto ${reveal(inView)}`}>
            <h2 className="font-display text-white text-2xl sm:text-3xl font-medium tracking-tight mb-4">Stories are on the way.</h2>
            <p className="text-white/55 font-light leading-relaxed mb-8">We'll share our events, talks and milestones here. In the meantime, follow along on LinkedIn.</p>
            {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="btn-secondary px-6 py-3.5">Follow Datatrop on LinkedIn <Arrow /></a>}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-20">
                <Eyebrow className="mb-8">Upcoming</Eyebrow>
                <div className="grid gap-5">
                  {upcoming.map((p, i) => <PostCard key={p.id} post={p} onOpen={setOpen} i={i} inView={inView} featured />)}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <Eyebrow className="mb-8">Latest</Eyebrow>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {past.map((p, i) => <PostCard key={p.id} post={p} onOpen={setOpen} i={i} inView={inView} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {open && <PostModal post={open} onClose={close} />}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INNER PAGE HEADER — shared by About / What We Do / Industries
// ═══════════════════════════════════════════════════════════════════════════════
// Every inner page (About, What We Do, Industries, Contact) uses this header at
// the same fixed height and padding, so the title lands in the same place on
// each page whatever the copy length.
function PageHero({ eyebrow, title, glow, intro, links = [], linksLabel = 'On this page', img, imgAlt = '', imgPos = '50% 50%' }) {
  return (
    <section className="page-hero relative overflow-hidden bg-[#070305] flex flex-col lg:block">
      {/* Photo: left of the header on desktop (fading into the dark), on top on phones */}
      <div className="relative order-1 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[64%] h-[360px] sm:h-[440px] lg:h-auto mt-[72px] lg:mt-0">
        <img src={img} alt={imgAlt} className="absolute inset-0 w-full h-full object-cover who-img" style={{ objectPosition: imgPos }} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_3_5/0.6),transparent_35%,transparent_70%,rgb(7_3_5/0.6))]" />
      </div>

      <div className={`relative z-10 order-2 ${WRAP} w-full lg:min-h-[max(640px,100svh)] flex items-center pt-10 lg:pt-28 pb-14 sm:pb-16`}>
        <div className="w-full lg:w-[44%] lg:ml-auto">
          <Eyebrow className="mb-6 anim-fade">{eyebrow}</Eyebrow>
          <h1 className="font-display text-[38px] leading-[1.05] sm:text-5xl lg:text-[52px] font-medium text-white tracking-[-0.035em] mb-6 anim-rise text-balance">
            {title} {glow && <span className="text-glow">{glow}</span>}
          </h1>
          {intro && (
            <p className="text-base sm:text-lg text-white/65 font-light leading-relaxed anim-rise" style={{ animationDelay: '0.1s' }}>
              {intro}
            </p>
          )}
          {links.length > 0 && (
            <nav aria-label={linksLabel} className="mt-8 flex flex-wrap items-center gap-2 anim-fade" style={{ animationDelay: '0.25s' }}>
              {links.map(([label, href]) => (
                <a key={href} href={href} className="text-[13px] px-3.5 py-2 rounded-full border border-white/15 bg-white/[0.03] text-white/75 hover:text-white hover:border-rose/50 transition-colors">
                  {label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Home: one card per page, so the homepage stays short ────────────────────
const EXPLORE = [
  {
    href: '/about',
    label: 'About',
    img: exploreAboutImg,
    title: 'Who we are and how we think',
    desc: 'Our philosophy, the Datatrop method, and the kinds of problems we take on.',
    tags: ['Decipher', 'Derive', 'Datatrop'],
  },
  {
    href: '/what-we-do',
    label: 'What We Do',
    img: exploreWhatImg,
    title: 'Intelligent systems, engineered end to end',
    desc: 'From strategic intelligence and business systems to AI agents, platforms and integrations.',
    tags: ['Automation', 'AI agents', 'Platforms', 'Data & BI', 'Process redesign'],
  },
  {
    href: '/industries',
    label: 'Industries',
    img: exploreIndustriesImg,
    title: 'Defined by complexity, not by industry',
    desc: 'We work wherever complex problems exist, from manufacturing floors to financial operations.',
    tags: ['Manufacturing', 'Supply chain', 'Healthcare', 'Finance', 'And more'],
  },
]

function CircleArrow({ className = '' }) {
  return (
    <span className={`w-10 h-10 rounded-full border border-white/25 bg-black/30 backdrop-blur flex items-center justify-center text-white transition-colors group-hover:border-rose group-hover:bg-[rgb(var(--accent)_/_0.25)] ${className}`}>
      <Arrow className="w-4 h-4" />
    </span>
  )
}

function ExplorePages() {
  const [ref, inView] = useInView()
  return (
    <section id="explore" className="glow-section alt py-24 sm:py-32 border-t border-white/[0.06]">
      <div className={WRAP} ref={ref}>
        <div className={`grid lg:grid-cols-12 gap-6 items-end mb-12 sm:mb-14 ${reveal(inView)}`}>
          <div className="lg:col-span-7">
            <Eyebrow className="mb-5">Explore Datatrop</Eyebrow>
            <h2 className="font-display text-[34px] sm:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.05]">
              See how we turn complexity <span className="text-glow">into systems.</span>
            </h2>
          </div>
          <p className="lg:col-span-5 text-white/60 text-base sm:text-lg font-light leading-relaxed">
            Explore our philosophy, what we build, and the real-world problems we solve across industries.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {EXPLORE.map(({ href, label, img, title, desc, tags }, i) => (
            <a
              key={href}
              href={href}
              className={`group card card-hover overflow-hidden flex flex-col ${reveal(inView)}`}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <div className="relative h-48 overflow-hidden">
                <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_3_5/0.55),transparent_45%)]" />
                <span className="absolute top-5 left-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/85">{label}</span>
                <CircleArrow className="absolute top-4 right-4" />
              </div>
              <div className="p-7 flex flex-col flex-1">
                <h3 className="font-display text-white text-xl font-medium tracking-tight mb-3">{title}</h3>
                <p className="text-white/55 text-sm font-light leading-relaxed mb-6 flex-1">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="px-3 py-1.5 rounded-full border border-white/15 text-[12px] text-white/75">{t}</span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Home: real reference cases, taken from the problems we solve (admin) ────
const CASE_IMAGES = [
  [/operat|fragment|inventor|dispatch/i, caseOperationsImg],
  [/communic|call|automotive|crm/i, caseAutomotiveImg],
  [/voice|human|depend|workforce/i, caseVoiceImg],
]
const caseImage = (p, i) =>
  (CASE_IMAGES.find(([re]) => re.test(`${p.title} ${p.reference_case}`)) || CASE_IMAGES[i % CASE_IMAGES.length])[1]
// "Unified Operations Systems, covering sales…" → "Unified Operations Systems"
const caseTitle = (text) => text.split(/,| with | capable | covering | that /)[0].trim()

function CaseStudies({ problems }) {
  const [ref, inView] = useInView()
  const cases = problems.filter((p) => p.reference_case && p.reference_case.trim()).slice(0, 4)
  if (!cases.length) return null
  return (
    <section id="case-studies" className="glow-section py-24 sm:py-32 border-t border-white/[0.06]">
      <div className={WRAP} ref={ref}>
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 ${reveal(inView)}`}>
          <div>
            <Eyebrow className="mb-5">Real problems. Real outcomes.</Eyebrow>
            <h2 className="font-display text-[34px] sm:text-5xl font-medium text-white tracking-[-0.03em] leading-[1.05]">From complexity to impact.</h2>
          </div>
          <GhostButton href="/what-we-do#solve">See the problems we solve</GhostButton>
        </div>
        <div className={`grid sm:grid-cols-2 ${cases.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-5`}>
          {cases.map((p, i) => (
            <a
              key={p.id}
              href="/what-we-do#solve"
              title={p.reference_case}
              className={`group relative aspect-[4/3] sm:aspect-[4/5] lg:aspect-[4/3] rounded-[1.25rem] overflow-hidden border border-white/10 ${reveal(inView)}`}
              style={{ transitionDelay: `${i * 110}ms` }}
            >
              <img src={caseImage(p, i)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_3_5/0.1)_20%,rgb(7_3_5/0.96)_85%)]" />
              <CircleArrow className="absolute top-4 right-4" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-display text-white text-lg font-medium leading-snug tracking-tight mb-4">{caseTitle(p.reference_case)}</h3>
                <span className="inline-block px-3 py-1.5 rounded-full border border-white/20 bg-black/30 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">{p.title}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Industries page: the four industries we are most often asked about ──────
const FEATURED_INDUSTRIES = [
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    lead: 'Operational systems for production complexity.',
    body: 'Sales, procurement, inventory, dispatch and finance connected into one operating platform, so production runs on live data instead of spreadsheets and phone calls.',
    icon: 'M3 21h18M5 21V10l5 3V10l5 3V6l4 2v13M9 17h1m4 0h1',
  },
  {
    id: 'distribution',
    name: 'Distribution & Trading',
    lead: 'Systems that keep fast-moving supply chains in sync.',
    body: 'Orders, stock, pricing and collections in one view, with AI agents that take on reconciliation, follow-ups and reporting.',
    icon: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    lead: 'Intelligent systems for regulated, data-heavy environments.',
    body: 'Scheduling, records and patient communication workflows engineered with privacy, access control and auditability built in from the start.',
    icon: 'M12 21s-7-4.35-9.5-8.5C.5 9 2.5 5 6.5 5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 4 0 6 4 4 7.5C19 16.65 12 21 12 21zM9 12h6M12 9v6',
  },
  {
    id: 'financial-services',
    name: 'Financial Services',
    lead: 'Decision intelligence for complex, high-stakes operations.',
    body: 'Real-time visibility for leadership, automated reconciliation, and a traceable record of every decision for teams that cannot afford errors.',
    icon: 'M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18',
  },
]

function FeaturedIndustries() {
  const [ref, inView] = useInView()
  return (
    <section id="featured" className="glow-section alt py-24 sm:py-32">
      <div className={WRAP} ref={ref}>
        <SectionHead eyebrow="Where we're asked most" title="Four industries, one pattern." intro="Different domains, the same underlying problem: disconnected systems, manual work and decisions made on stale data." inView={inView} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURED_INDUSTRIES.map((ind, i) => (
            <article
              key={ind.id}
              id={ind.id}
              className={`card card-hover scroll-mt-28 p-8 sm:p-10 flex flex-col ${reveal(inView)}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="icon-tile w-12 h-12 mb-7">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d={ind.icon} /></svg>
              </div>
              <h3 className="font-display text-white text-2xl font-medium tracking-tight mb-2">{ind.name}</h3>
              <p className="text-rose-soft text-sm mb-4">{ind.lead}</p>
              <p className="text-white/60 font-light leading-relaxed flex-1">{ind.body}</p>
              <a href="/contact#book" className="group mt-8 inline-flex items-center gap-2 text-sm text-white/85 hover:text-white">
                Discuss your operation
                <Arrow className="w-4 h-4 text-rose-soft transition-transform group-hover:translate-x-1" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact page header ──────────────────────────────────────────────────────
const CONTACT_STEPS = [
  { title: 'Tell us about the problem', desc: 'Book a time or send a message. A few lines on what is getting in the way is enough.' },
  { title: 'Talk to an engineer', desc: 'A 30-minute call with someone who builds systems, not a sales script.' },
  { title: 'Get a clear next step', desc: 'Whether that is a scoped engagement, a quick fix or an honest “not us”.' },
]

function ContactHero({ settings }) {
  const email = settings.contact_email || 'sales@datatrop.in'
  const phone = settings.contact_phone || '+91 79029 17795'
  return (
    <>
      <PageHero
        img={pageContactImg}
        imgAlt="A city at dusk seen from above"
        imgPos="50% 60%"
        eyebrow="Contact"
        title="Let's talk about the problem"
        glow="you're solving."
        intro="Book a strategy call straight into our calendar, or send us a message and we'll get back to you within 24 hours."
        linksLabel="Get in touch"
        links={[['Book a strategy call', '/contact#book'], ['Send a message', '/contact#message']]}
      />
      <section className="glow-section pt-6 pb-16 sm:pb-20">
        <div className={WRAP}>
          <div className="grid sm:grid-cols-3 gap-4">
            {CONTACT_STEPS.map((st, i) => (
              <div key={st.title} className="card p-6">
                <p className="font-mono text-[11px] text-rose-soft mb-3">Step {i + 1}</p>
                <h3 className="font-display text-white text-lg font-medium tracking-tight mb-2">{st.title}</h3>
                <p className="text-white/55 text-sm font-light leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <span className="text-white/45">Prefer email? <a href={`mailto:${email}`} className="text-white hover:text-rose-soft select-all">{email}</a></span>
            <span className="text-white/45">Or call <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="text-white hover:text-rose-soft">{phone}</a></span>
          </div>
        </div>
      </section>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT / BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
const INDUSTRY_OPTIONS = ['Manufacturing', 'Distribution & Trading', 'Healthcare', 'Financial Services', 'Retail', 'Automotive', 'Logistics', 'Other']
const SIZE_OPTIONS = ['1–50', '50–200', '200–1,000', '1,000+']

const CONTACT_ICONS = {
  mail: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  phone: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-2.26 1.13a11.04 11.04 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" /></svg>,
  linkedin: <svg className="w-[17px] h-[17px]" fill="currentColor" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" /></svg>,
  pin: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.66 16.66L13.41 20.9a2 2 0 01-2.83 0l-4.24-4.24a8 8 0 1111.32 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
}

function Contact({ settings }) {
  const [ref, inView] = useInView()
  const emptyForm = { name: '', company: '', email: '', industry: '', size: '', challenge: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErr('')
    try {
      await api.submitLead({
        name: form.name,
        company: form.company,
        email: form.email,
        industry: form.industry,
        company_size: form.size,
        challenge: form.challenge,
      })
      track('generate_lead', { method: 'contact_form', industry: form.industry || undefined, company_size: form.size || undefined })
      setSubmitted(true)
      setForm(emptyForm)
    } catch (e2) {
      setErr(e2.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const email = settings.contact_email || 'sales@datatrop.in'
  const phone = settings.contact_phone || '+91 79029 17795'
  const linkedin = settings.linkedin_url || DEFAULT_LINKEDIN
  const location = settings.location || 'Kerala, India'

  const info = [
    { label: 'Email', value: email, href: `mailto:${email}`, icon: CONTACT_ICONS.mail },
    { label: 'Phone', value: phone, href: `tel:${phone.replace(/[^0-9+]/g, '')}`, icon: CONTACT_ICONS.phone },
    { label: 'LinkedIn', value: linkedin.replace(/^https?:\/\/(www\.)?/, ''), href: linkedin, icon: CONTACT_ICONS.linkedin, external: true },
    { label: 'Location', value: location, href: null, icon: CONTACT_ICONS.pin },
  ]

  return (
    <section className="glow-section pt-8 pb-24 sm:pb-32">
      <div className={WRAP}>
        {/* Native scheduler — writes straight into our Outlook calendar */}
        <div id="book" className="scroll-mt-28 grid lg:grid-cols-12 gap-10 mb-24 sm:mb-32">
          <div className="lg:col-span-4">
            <Eyebrow className="mb-5">Book a strategy call</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white tracking-[-0.03em] leading-[1.08] mb-4">Pick a time that works for you.</h2>
            <p className="text-white/55 font-light leading-relaxed">30 minutes with an engineer. Times are shown in IST and the invite lands straight in your calendar.</p>
          </div>
          <div className="lg:col-span-8 card overflow-hidden">
            <BookingWidget />
          </div>
        </div>

        <div ref={ref} id="message" className="scroll-mt-28 grid lg:grid-cols-12 gap-10 items-start">
          {/* Contact details */}
          <div className={`lg:col-span-4 ${reveal(inView)}`}>
            <Eyebrow className="mb-5">Or send a message</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white tracking-[-0.03em] leading-[1.08] mb-10">Tell us what's getting in the way.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-y-6 gap-x-4">
              {info.map((it) => {
                const ext = it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
                const tile = 'flex-shrink-0 w-11 h-11 rounded-full border border-[rgb(var(--accent)_/_0.35)] bg-[rgb(var(--maroon)_/_0.35)] flex items-center justify-center text-white transition-colors'
                return (
                  <div key={it.label} className="flex items-center gap-3.5 min-w-0">
                    {it.href
                      ? <a href={it.href} {...ext} aria-label={it.label} className={`${tile} hover:border-rose hover:bg-[rgb(var(--accent)_/_0.25)]`}>{it.icon}</a>
                      : <span className={tile}>{it.icon}</span>}
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1">{it.label}</div>
                      {it.href
                        ? <a href={it.href} {...ext} className="text-white text-sm hover:text-rose-soft transition-colors break-words">{it.value}</a>
                        : <div className="text-white text-sm break-words">{it.value}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Message form (alternative to booking a time above) */}
          <div className={`lg:col-span-8 card p-6 sm:p-9 ${reveal(inView)}`} style={{ transitionDelay: '100ms' }}>
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="icon-tile w-12 h-12 mb-5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-display text-white text-lg mb-2">Request received</h3>
                <p className="text-white/60 text-sm font-light">We'll reach out within 24 hours to schedule your session.</p>
                <button onClick={() => setSubmitted(false)} className="mt-6 text-rose-soft hover:text-white text-sm">Send another →</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input name="name" value={form.name} onChange={set} required placeholder="Name" className={INPUT} />
                  <input name="company" value={form.company} onChange={set} placeholder="Company" className={INPUT} />
                </div>
                <input type="email" name="email" value={form.email} onChange={set} required placeholder="Work email" className={INPUT} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <select name="industry" value={form.industry} onChange={set} className={INPUT}>
                    <option value="">Industry</option>
                    {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select name="size" value={form.size} onChange={set} className={INPUT}>
                    <option value="">Company size</option>
                    {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o} employees</option>)}
                  </select>
                </div>
                <textarea name="challenge" value={form.challenge} onChange={set} required rows={5} placeholder="Briefly describe your biggest operational challenge" className={`${INPUT} resize-none`} />
                {err && (
                  <div className="text-red-300 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">{err}</div>
                )}
                <button type="submit" disabled={submitting} className="btn-primary w-full py-4 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Sending…' : 'Send Message'}
                  {!submitting && <Arrow />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
const FOOTER_COLUMNS = [
  { title: 'About', links: [['Who We Are', '/about#who-we-are'], ['Our Philosophy', '/about#philosophy'], ['How We Engage', '/about#engage'], ['Complexity Scale', '/about#approach'], ['Why Datatrop', '/about#why']] },
  { title: 'What We Do', links: [['Capabilities', '/what-we-do#capabilities'], ['AI Workforce', '/what-we-do#workforce'], ['Problems We Solve', '/what-we-do#solve'], ['Industries', '/industries']] },
  { title: 'Connect', links: [['News & Events', '/news'], ['Contact Us', '/contact'], ['Book a Call', '/contact#book'], ['Send a Message', '/contact#message']] },
  { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']] },
]

function Footer({ settings }) {
  const company = settings.company_name || 'Datatrop AI Systems'
  const tagline = settings.tagline || 'Engineering Intelligence. Solving Complexity.'
  const location = settings.location || 'Kerala, India'
  const email = settings.contact_email || 'sales@datatrop.in'
  const linkedin = settings.linkedin_url || DEFAULT_LINKEDIN

  return (
    <footer className="bg-[rgb(var(--page))] relative overflow-hidden border-t border-white/[0.07] pt-20 pb-10">
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(ellipse_70%_100%_at_20%_100%,rgb(var(--maroon)/0.9),transparent_70%)] pointer-events-none" />
      <div className={`relative ${WRAP}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-10 pb-16">
          <div className="col-span-2 sm:col-span-4 lg:col-span-2">
            <LogoMark footer />
            <p className="text-white/55 text-sm font-light mt-5 max-w-xs leading-relaxed">{tagline}</p>
            <div className="flex items-center gap-3 mt-7">
              <a href={`mailto:${email}`} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-white hover:border-rose/50 transition-colors" aria-label="Email">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-white hover:border-rose/50 transition-colors" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" /></svg>
                </a>
              )}
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em] mb-5">{col.title}</h4>
              <div className="flex flex-col gap-3">
                {col.links.map(([l, h]) => (
                  <a key={l} href={h} className="text-white/65 hover:text-white text-sm transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Oversized wordmark */}
        <div aria-hidden="true" className="font-display font-semibold tracking-[0.02em] leading-none text-[14vw] lg:text-[170px] text-center select-none bg-gradient-to-b from-white/[0.10] to-white/0 bg-clip-text text-transparent pb-4">
          DATATROP
        </div>

        <div className="relative pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} {company}. All rights reserved.
            {analyticsAvailable && (
              <>
                {' · '}
                <button type="button" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))} className="underline decoration-white/20 underline-offset-2 hover:text-white">Cookie settings</button>
              </>
            )}
          </p>
          <p className="font-display text-white/40 text-[11px] uppercase tracking-[0.3em]">Engineering impossibilities to reality</p>
          <p className="text-white/40 text-xs">{location}</p>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COOKIE CONSENT — analytics only load after "Accept"
// ═══════════════════════════════════════════════════════════════════════════════
const COOKIE_SETTINGS_EVENT = 'datatrop:cookie-settings'

function ConsentBanner({ onAccept }) {
  // Not rendered into the pre-built HTML (no window there), and only shown when
  // analytics are configured and the visitor hasn't chosen yet.
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && analyticsAvailable && getConsent() === null)

  useEffect(() => {
    const reopen = () => setOpen(true)
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  if (!open) return null
  const choose = (value) => {
    setConsent(value)
    setOpen(false)
    if (value === 'granted') onAccept()
  }
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed z-[60] left-4 right-4 sm:right-auto sm:left-6 sm:max-w-[420px] anim-rise"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="rounded-[1.25rem] p-6 border border-[rgb(var(--accent)_/_0.25)] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9),0_0_40px_-12px_rgb(var(--accent)/0.35)]"
        style={{ background: 'linear-gradient(165deg, rgb(var(--maroon)) 0%, rgb(var(--dark-maroon)) 60%, rgb(var(--surface)) 100%)' }}
      >
        <p className="font-display text-white text-base font-medium mb-2">Cookies, briefly</p>
        <p className="text-white/60 text-sm font-light leading-relaxed mb-5">
          We'd like to use Google Analytics cookies to see which pages help visitors. No advertising, and we never sell your data.{' '}
          <a href="/privacy" className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-rose">Privacy policy</a>
        </p>
        <div className="flex gap-2.5">
          <button type="button" onClick={() => choose('granted')} className="btn-primary px-5 py-3 text-[13px] flex-1">Accept analytics</button>
          <button type="button" onClick={() => choose('denied')} className="btn-secondary px-5 py-3 text-[13px] flex-1">Decline</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
// Convert "#3B82F6" → "59 130 246" for use in rgb(var(--brand) / a)
function hexToChannels(hex) {
  if (typeof hex !== 'string') return null
  const m = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null
  return `${parseInt(m.slice(0, 2), 16)} ${parseInt(m.slice(2, 4), 16)} ${parseInt(m.slice(4, 6), 16)}`
}

const STATIC_PREVIEW = import.meta.env.VITE_STATIC_PREVIEW === 'true'

const pageFromPath = (path) => pageKeyFromPath(path) || 'home'

function scrollToHash(hash) {
  const id = (hash || '').replace('#', '')
  const el = id && document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  else window.scrollTo({ top: 0, behavior: 'instant' })
}

export default function App({ page: initialPage = 'home' }) {
  const [page, setPage] = useState(initialPage)
  const pendingHash = useRef(typeof window !== 'undefined' ? window.location.hash : '')
  const [settings, setSettings] = useState({})
  const [customers, setCustomers] = useState([])
  const [showcases, setShowcases] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [problems, setProblems] = useState(DEFAULT_PROBLEMS)
  const [serviceLines, setServiceLines] = useState(DEFAULT_SERVICE_LINES)
  const [posts, setPosts] = useState(null)

  useEffect(() => {
    initAnalytics()
    api.getContent().then((row) => {
      if (!row) return
      setSettings(row)
      // Apply theme colours from settings
      const brand = hexToChannels(row.brand_color)
      const accent = hexToChannels(row.accent_color)
      if (brand) document.documentElement.style.setProperty('--brand', brand)
      if (accent) document.documentElement.style.setProperty('--accent', accent)
    }).catch(() => {})
    api.getPublic('customers').then((d) => { if (Array.isArray(d)) setCustomers(d) }).catch(() => {})
    api.getPublic('ai_showcase').then((d) => { if (Array.isArray(d)) setShowcases(d) }).catch(() => {})
    api.getPublic('testimonials').then((d) => { if (Array.isArray(d)) setTestimonials(d) }).catch(() => {})
    api.getPublic('posts').then((d) => setPosts(Array.isArray(d) ? d : [])).catch(() => setPosts([]))
    api.getPublic('problems').then((d) => { if (Array.isArray(d) && d.length) setProblems(d) }).catch(() => {})
    api.getPublic('service_lines').then((d) => { if (Array.isArray(d) && d.length) setServiceLines(d) }).catch(() => {})
  }, [])

  // Page title + land on any #section in the URL once the page has rendered
  useEffect(() => {
    applyPageMeta(page)
    trackPageView(PAGE_META[page].path, PAGE_META[page].title)
    // Clear the pending hash only once it has been used, so React's dev-mode
    // double effect run doesn't lose it
    const hash = pendingHash.current
    const t = setTimeout(() => { pendingHash.current = ''; scrollToHash(hash) }, 60)
    return () => clearTimeout(t)
  }, [page])

  // Browser back/forward between pages
  useEffect(() => {
    const onPop = () => {
      pendingHash.current = window.location.hash
      setPage(pageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Handle links between site pages without a full reload. Same-page
  // section links just scroll; anything else (admin, legal, external) is left alone.
  const onLinkClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest('a')
    const href = a?.getAttribute('href')
    if (!href) return
    const where = a.closest('nav') ? 'nav' : a.closest('footer') ? 'footer' : (a.closest('section')?.id || 'page')
    if (href.startsWith('mailto:')) track('contact_click', { method: 'email' })
    else if (href.startsWith('tel:')) track('contact_click', { method: 'phone' })
    else if (href.endsWith('#book')) track('book_call_click', { location: where, page })
    else if (href.endsWith('#message')) track('message_click', { location: where, page })
    if (!href.startsWith('/') || a.target === '_blank') return
    const [path, hash = ''] = href.split('#')
    if (!pageKeyFromPath(path)) return
    const target = pageFromPath(path)
    e.preventDefault()
    // The static approval preview is a single file, so it switches pages without touching the URL
    if (!STATIC_PREVIEW) {
      try { window.history.pushState({}, '', href) } catch { /* sandboxed frame: keep going */ }
    }
    if (target === page) scrollToHash(hash ? `#${hash}` : '')
    else {
      pendingHash.current = hash ? `#${hash}` : ''
      setPage(target)
    }
  }

  const testimonialsSection = testimonials.length > 0
    ? <Testimonials items={testimonials} reviewsUrl={settings.google_reviews_url} />
    : SHOW_PREVIEW_TESTIMONIALS && <Testimonials items={PREVIEW_TESTIMONIALS} />

  return (
    <>
    <IntroOverlay />
    <div className="site min-h-screen overflow-x-clip" onClick={onLinkClick}>
      <Navbar page={page} />
      {page === 'about' && (
        <>
          <PageHero
            img={pageAboutImg}
            imgAlt="A team working through a problem at a whiteboard"
            imgPos="50% 40%"
            eyebrow="About"
            title="We turn complexity into"
            glow="stable systems."
            intro="We design, build and operate the intelligent systems that restore order wherever complexity slows an organization down."
            links={[['Who we are', '/about#who-we-are'], ['Our philosophy', '/about#philosophy'], ['How we engage', '/about#engage'], ['Complexity scale', '/about#approach'], ['Why Datatrop', '/about#why']]}
          />
          <AboutIntro about={settings.about_bio} />
          <Philosophy />
          <ThreePillars />
          <Approach />
          <WhyDatatrop />
          <FinalCta vision />
        </>
      )}
      {page === 'what-we-do' && (
        <>
          <PageHero
            img={pageWhatImg}
            imgAlt="Rows of servers in a data centre"
            imgPos="50% 50%"
            eyebrow="What we do"
            title="Intelligent systems,"
            glow="engineered end to end."
            intro="From a single automated workflow to an operating platform for the whole organization. We design it, build it and keep it running."
            links={[['Capabilities', '/what-we-do#capabilities'], ['AI workforce', '/what-we-do#workforce'], ['Problems we solve', '/what-we-do#solve']]}
          />
          <WhatWeBuild serviceLines={serviceLines} />
          <Workforce />
          <WhatWeSolve problems={problems} />
          {showcases.length > 0 && <Showcase items={showcases} />}
          <FinalCta />
        </>
      )}
      {page === 'industries' && (
        <>
          <PageHero
            img={pageIndustriesImg}
            imgAlt="A container port with cranes at dusk"
            imgPos="40% 55%"
            eyebrow="Industries"
            title="Defined by complexity,"
            glow="not by industry."
            intro="We don't define ourselves by industries. We define ourselves by the complexity of the challenge. Wherever it falls on that spectrum, Datatrop can engage."
            links={FEATURED_INDUSTRIES.map((f) => [f.name, `/industries#${f.id}`]).concat([['All industries', '/industries#all-industries']])}
          />
          <FeaturedIndustries />
          <Industries />
          <FinalCta />
        </>
      )}
      {page === 'news' && (
        <>
          <PageHero
            img={pageNewsImg}
            imgAlt="An audience watching a talk in a lit auditorium"
            imgPos="50% 50%"
            eyebrow="News & Events"
            title="What we've been"
            glow="up to."
            intro="Events, talks, launches and milestones from the Datatrop team."
          />
          <NewsList posts={posts} linkedin={settings.linkedin_url || DEFAULT_LINKEDIN} />
          <FinalCta />
        </>
      )}
      {page === 'contact' && (
        <>
          <ContactHero settings={settings} />
          <Contact settings={settings} />
        </>
      )}
      {page === 'home' && (
        <>
          <Hero headline={settings.hero_headline} subtext={settings.hero_subtext} />
          <WhoWeAre />
          <Philosophy />
          <HowWeWork />
          <ExplorePages />
          <CaseStudies problems={problems} />
          {testimonialsSection}
          {customers.length > 0 && <Clients customers={customers} />}
          <FinalCta />
        </>
      )}
      <Footer settings={settings} />
      <ConsentBanner onAccept={() => trackPageView(PAGE_META[page].path, PAGE_META[page].title)} />
    </div>
    </>
  )
}

import { useState, useEffect, useRef } from 'react'
import './App.css'
import { api } from './lib/api'

// ── Booking: handled natively by <BookingWidget/>, which reads real availability
//    from the connected Outlook calendar and books the meeting on it.
//    "Book Strategy Call" buttons scroll straight to the scheduler.
const BOOKING_URL = ''

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useInView(threshold = 0.14) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

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
      const start = vh * 0.85
      const end = vh * 0.4
      const v = (start - r.top) / (r.height + (start - end))
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
  : { href: '#book' }

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

const INPUT = 'w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/35 text-sm font-light focus:outline-none focus:border-[rgb(var(--accent)_/_0.6)] focus:bg-white/[0.06] transition-colors [&>option]:bg-[#1B050D]'

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

// ── Logo ──────────────────────────────────────────────────────────────────────
const _logoModsWhite = import.meta.glob('./assets/logo.png', { eager: true })
const logoSrcWhite = _logoModsWhite['./assets/logo.png']?.default ?? null

function LogoMark({ footer = false }) {
  if (logoSrcWhite) {
    return <img src={logoSrcWhite} alt="Datatrop AI Systems" className="w-auto object-contain" style={{ height: footer ? '32px' : '28px' }} />
  }
  return <span className="font-display text-white font-semibold tracking-tight text-xl">Datatrop</span>
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
    label: 'What We Do',
    href: '#capabilities',
    panel: [
      { title: 'Enterprise AI Systems', desc: 'Unified operating platforms across every department.', href: '#capabilities' },
      { title: 'AI Workforce Platforms', desc: 'Multi-agent teams that execute operational work.', href: '#workforce' },
      { title: 'Revenue Intelligence', desc: 'Lead intelligence and sales automation.', href: '#capabilities' },
      { title: 'Communication Intelligence', desc: 'Omnichannel, call and conversation intelligence.', href: '#capabilities' },
    ],
  },
  {
    label: 'About',
    href: '#about',
    panel: [
      { title: 'Who We Are', desc: 'Our engineering philosophy and approach.', href: '#about' },
      { title: 'How We Engage', desc: 'Build, solve and innovate.', href: '#engage' },
      { title: 'The Complexity Scale', desc: 'From automation to new products.', href: '#approach' },
      { title: 'Why Datatrop', desc: 'What sets our systems apart.', href: '#why' },
    ],
  },
  {
    label: 'Industries',
    href: '#industries',
    panel: [
      { title: 'Manufacturing', desc: 'Operational systems for production complexity.', href: '#industries' },
      { title: 'Distribution & Trading', desc: 'Systems that keep fast-moving supply chains in sync.', href: '#industries' },
      { title: 'Healthcare', desc: 'Intelligent systems for regulated, data-heavy environments.', href: '#industries' },
      { title: 'Financial Services', desc: 'Decision intelligence for complex, high-stakes operations.', href: '#industries' },
    ],
  },
]

function Navbar() {
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
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${solid ? 'bg-[#0B0407]/85 backdrop-blur-xl border-b border-white/[0.07]' : 'bg-transparent border-b border-transparent'}`}
        onMouseLeave={() => setOpenPanel(null)}
      >
        <div className={WRAP}>
          <div className="flex items-center justify-between h-[72px]">
            <a href="#home" aria-label="Datatrop home"><LogoMark /></a>

            <div className="hidden lg:flex items-center gap-1">
              {MEGA_MENU.map((m) => (
                <div key={m.label} onMouseEnter={() => setOpenPanel(m.label)}>
                  <a
                    href={m.href}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] transition-colors duration-200 ${openPanel === m.label ? 'text-white' : 'text-white/65 hover:text-white'}`}
                  >
                    {m.label}
                    <svg className={`w-3 h-3 transition-transform duration-200 ${openPanel === m.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                </div>
              ))}
              <a href="#contact" onMouseEnter={() => setOpenPanel(null)} className="px-4 py-2.5 text-[14px] text-white/65 hover:text-white transition-colors duration-200">Contact</a>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <a href="#contact" className="btn-secondary px-5 py-3 text-[13px]">Send a message</a>
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
        <div className="lg:hidden fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[#0B0407]/95 backdrop-blur-xl overflow-y-auto">
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
                    {m.panel.map((p) => (
                      <a key={p.title} href={p.href} onClick={() => setMenuOpen(false)} className="block px-1 py-2.5 text-sm text-white/60 hover:text-white font-light">
                        {p.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <a href="#contact" onClick={() => setMenuOpen(false)} className="px-1 py-4 font-display text-lg text-white border-b border-white/[0.08]">Contact</a>
            <div className="pt-6 flex flex-col gap-3" onClick={() => setMenuOpen(false)}>
              <BookButton className="w-full" />
              <GhostButton href="#contact" className="w-full">Send a message</GhostButton>
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

const TECHNOLOGIES = [
  'Artificial Intelligence', 'Multi-agent Systems', 'Data Engineering', 'Enterprise Software',
  'Cloud Infrastructure', 'System Integrations', 'Advanced Analytics', 'Process Automation',
]

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
    <section id="home" className="relative min-h-[100svh] flex flex-col overflow-hidden bg-brand-gradient">
      <Arcs />
      {/* Fade into the page */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#070305] to-transparent pointer-events-none" />

      <div className={`relative z-10 ${WRAP} w-full flex-1 flex flex-col justify-center pt-36 pb-16`}>
        <p className="font-display text-[11px] sm:text-[13px] tracking-[0.42em] text-white/70 uppercase mb-8 anim-fade">
          Engineering impossibilities<br className="sm:hidden" /> to reality
        </p>

        <h1 className="font-display max-w-5xl text-[44px] leading-[1.02] sm:text-7xl lg:text-[96px] font-medium text-white tracking-[-0.045em] mb-8 anim-rise text-balance">
          {head} {tail && <span className="text-glow">{tail}</span>}
        </h1>

        <p className="max-w-2xl text-base sm:text-lg text-white/65 font-light leading-relaxed mb-11 anim-rise" style={{ animationDelay: '0.12s' }}>
          {s}
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 anim-rise" style={{ animationDelay: '0.22s' }}>
          <BookButton />
          <GhostButton href="#capabilities">Explore our systems</GhostButton>
        </div>
      </div>

      {/* Technology strip */}
      <div className="relative z-10 border-t border-white/[0.07] bg-black/20 backdrop-blur-sm anim-fade" style={{ animationDelay: '0.4s' }}>
        <div className={`${WRAP} flex items-center gap-6 py-5`}>
          <span className="hidden sm:block flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Engineered with</span>
          <div className="marquee flex-1 overflow-hidden">
            <div className="marquee-track">
              {[...TECHNOLOGIES, ...TECHNOLOGIES].map((t, i) => (
                <span key={i} className="flex items-center gap-6 pr-6 text-sm text-white/60 whitespace-nowrap">
                  {t}
                  <span className="w-1 h-1 rounded-full bg-rose/60" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATEMENT — big editorial paragraph, revealed word by word as you scroll
// ═══════════════════════════════════════════════════════════════════════════════
const STATEMENT_A = 'We don’t start with technology. We start with the problem, then design, build and operate the intelligent system that solves it.'
const STATEMENT_B = 'Software, AI, automation, or something that doesn’t exist yet. That decision comes after we understand the problem, never before.'

const DEFAULT_ABOUT =
  'Datatrop AI Systems is an intelligent systems engineering company that designs, builds, and operates solutions for complex business and societal challenges. AI, automation, and software are not our identity; they are the delivery mechanisms we choose once we understand the problem.'

const PRINCIPLES = [
  'Engineered around the problem',
  'Systems over software',
  'Integration over isolation',
  'Measurable, lasting value',
]

function Statement({ about }) {
  const [ref, progress] = useScrollProgress()
  const [aboutRef, inView] = useInView()
  const words = [...STATEMENT_A.split(' ').map((w) => [w, false]), ...STATEMENT_B.split(' ').map((w) => [w, true])]
  const lit = progress * words.length * 1.08

  return (
    <section id="about" className="glow-section py-28 sm:py-40">
      <div className={WRAP}>
        <Eyebrow className="mb-10">Who we are</Eyebrow>
        <p ref={ref} className="font-display text-[28px] sm:text-[42px] lg:text-[54px] leading-[1.18] tracking-[-0.03em] font-medium max-w-6xl">
          {words.map(([w, second], i) => (
            <span
              key={i}
              className={`transition-colors duration-300 ${i < lit ? (second ? 'text-rose-soft' : 'text-white') : 'text-white/[0.14]'}`}
            >
              {w}{' '}
              {i === STATEMENT_A.split(' ').length - 1 && <br className="hidden sm:block" />}
            </span>
          ))}
        </p>

        <div ref={aboutRef} className={`mt-20 sm:mt-28 grid lg:grid-cols-12 gap-10 pt-10 border-t border-white/[0.08] ${reveal(inView)}`}>
          <p className="lg:col-span-5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Complexity is inevitable.<br />Chaos is optional.
          </p>
          <div className="lg:col-span-7">
            <p className="text-white/75 text-lg font-light leading-relaxed mb-8">{about || DEFAULT_ABOUT}</p>
            <div className="flex flex-wrap gap-2.5">
              {PRINCIPLES.map((p) => (
                <span key={p} className="text-[13px] px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                  {p}
                </span>
              ))}
            </div>
          </div>
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
          <div className="relative"><Console /></div>
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
    <section id="capabilities" className="glow-section alt py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="Capabilities"
          title="What we build."
          intro="Five system categories, each engineered around how your organization actually operates."
          inView={inView}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lead && (
            <div
              className={`md:col-span-2 lg:row-span-2 relative overflow-hidden rounded-[1.25rem] border border-white/10 min-h-[340px] flex flex-col justify-end p-8 sm:p-10 bg-brand-gradient ${reveal(inView)}`}
            >
              <Arcs variant="card" className="opacity-80" />
              <div className="relative">
                <div className="icon-tile w-12 h-12 mb-6"><CapIcon i={0} /></div>
                <h3 className="font-display text-white text-2xl sm:text-3xl font-medium tracking-tight mb-3">{lead.name}</h3>
                <p className="text-white/70 text-base font-light leading-relaxed max-w-md mb-7">{lead.examples}</p>
                <a {...bookProps} className="btn-secondary px-6 py-3.5">Talk to an engineer <Arrow /></a>
              </div>
            </div>
          )}
          {rest.map((s, i) => (
            <div
              key={s.id}
              className={`card card-hover p-7 ${reveal(inView)}`}
              style={{ transitionDelay: `${(i + 1) * 80}ms` }}
            >
              <div className="icon-tile w-11 h-11 mb-6"><CapIcon i={i + 1} /></div>
              <h3 className="font-display text-white text-lg font-medium tracking-tight mb-2.5">{s.name}</h3>
              <p className="text-white/55 text-sm font-light leading-relaxed">{s.examples}</p>
            </div>
          ))}
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
  { id: 'p1', title: 'Fragmented Operations', description: 'Disconnected systems become one intelligent operating platform.' },
  { id: 'p2', title: 'Revenue Leakage', description: 'Capture every opportunity with AI-driven sales intelligence.' },
  { id: 'p3', title: 'Communication Chaos', description: 'Unify calls, messages, and customer interactions into one intelligent communication layer.' },
  { id: 'p4', title: 'Organizational Intelligence', description: 'Turn scattered knowledge into permanent institutional memory.' },
  { id: 'p5', title: 'Human Dependency', description: 'Deploy AI workforces that execute repetitive work while humans focus on strategy.' },
  { id: 'p6', title: 'Decision Delay', description: 'Give leadership real-time visibility instead of week-old reports.' },
]

function WhatWeSolve({ problems }) {
  const [ref, inView] = useInView()
  return (
    <section id="solve" className="glow-section alt py-28 sm:py-36">
      <div className={`${WRAP} grid lg:grid-cols-12 gap-12`} ref={ref}>
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHead eyebrow="Track record" title="Problems we've solved." inView={inView} />
          </div>
        </div>
        <div className="lg:col-span-8 border-t border-white/[0.08]">
          {problems.map((p, i) => (
            <div
              key={p.id}
              className={`group grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr_auto] gap-x-4 items-start py-7 border-b border-white/[0.08] transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className="font-mono text-sm text-rose-soft/80 tabular-nums pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-white text-xl sm:text-2xl font-medium tracking-tight mb-2 transition-colors group-hover:text-rose-soft">{p.title}</h3>
                <p className="text-white/55 text-sm sm:text-base font-light leading-relaxed max-w-xl">{p.description || p.solution}</p>
              </div>
              <span className="hidden sm:flex w-10 h-10 rounded-full border border-white/10 items-center justify-center text-white/40 transition-all group-hover:border-rose/50 group-hover:text-white group-hover:-rotate-45">
                <Arrow />
              </span>
            </div>
          ))}
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
    <section id="industries" className="glow-section py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead
          eyebrow="What we work on"
          title="Defined by complexity, not by industry."
          intro="We don't define ourselves by industries. We define ourselves by the complexity of the challenge. Wherever it falls on that spectrum, Datatrop can engage."
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
  { value: '5+', label: 'System categories engineered' },
  { value: '8', label: 'Industries served' },
  { value: '24/7', label: 'Autonomous execution' },
  { value: '100%', label: 'Built around the problem' },
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`card p-7 ${reveal(inView)}`}
              style={{ transitionDelay: `${150 + i * 90}ms` }}
            >
              <div className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-glow mb-3">{s.value}</div>
              <div className="text-white/55 text-sm font-light leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
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
            <div key={c.id} className={`bg-[#0B0407] p-6 transition-all duration-500 ${inView ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${i * 50}ms` }}>
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
        <svg key={s} className={`${className} ${s < value ? 'text-rose' : 'text-white/10'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.33 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.95z" />
        </svg>
      ))}
    </div>
  )
}

function Testimonials({ items, reviewsUrl }) {
  const [ref, inView] = useInView()
  const rated = items.filter((t) => Number(t.rating) > 0)
  const avg = rated.length ? (rated.reduce((a, t) => a + Number(t.rating), 0) / rated.length).toFixed(1) : null

  return (
    <section className="glow-section py-28 sm:py-36">
      <div className={WRAP} ref={ref}>
        <SectionHead eyebrow="Client feedback" title="What our clients say." inView={inView} />
        {avg && (
            <div className={`flex items-center gap-3 -mt-6 mb-10 ${reveal(inView)}`}>
              <GoogleG className="w-5 h-5" />
              <span className="font-display text-white text-2xl">{avg}</span>
              <Stars value={Math.round(avg)} />
              <span className="text-white/45 text-sm font-light">from {rated.length} review{rated.length === 1 ? '' : 's'}</span>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <figure
              key={t.id}
              className={`card flex flex-col p-7 ${reveal(inView)}`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              {Number(t.rating) > 0 && <div className="mb-5"><Stars value={Number(t.rating)} /></div>}
              <blockquote className="text-white/75 text-base font-light leading-relaxed flex-1">“{t.quote}”</blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/[0.08] flex items-end justify-between gap-3">
                <div>
                  <div className="text-white text-sm font-medium">{t.name}</div>
                  {(t.role || t.company) && (
                    <div className="text-white/45 text-xs font-light mt-0.5">
                      {[t.role, t.company].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                {t.source === 'Google' && (
                  <span className="flex items-center gap-1.5 text-white/45 text-[11px] font-light flex-shrink-0" title="Review from Google">
                    <GoogleG />
                    Google
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
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
function FinalCta() {
  const [ref, inView] = useInView()
  return (
    <section className="py-12 sm:py-20">
      <div className={WRAP} ref={ref}>
        <div className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-brand-gradient px-6 py-20 sm:px-16 sm:py-28 ${reveal(inView)}`}>
          <Arcs />
          <div className="relative max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60 mb-8">Vision</p>
            <p className="font-display text-2xl sm:text-3xl text-white/80 font-light leading-snug tracking-tight mb-12">
              To become the world's most trusted systems engineering company for solving complex challenges through
              <span className="text-white font-normal"> intelligence, engineering, and innovation.</span>
            </p>
            <h2 className="font-display text-4xl sm:text-6xl font-medium text-white tracking-[-0.04em] leading-[1.02] mb-6">
              Ready to engineer your next competitive advantage?
            </h2>
            <p className="text-white/65 text-lg font-light leading-relaxed mb-10 max-w-xl">
              Let's discuss your business, your challenges, and the systems that will define your next decade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3.5">
              <BookButton />
              <GhostButton href="#contact">Send a message</GhostButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT / BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
const INDUSTRY_OPTIONS = ['Manufacturing', 'Distribution & Trading', 'Healthcare', 'Financial Services', 'Retail', 'Automotive', 'Logistics', 'Other']
const SIZE_OPTIONS = ['1–50', '50–200', '200–1,000', '1,000+']

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
  const linkedin = settings.linkedin_url || ''
  const location = settings.location || 'Kerala, India'

  const info = [
    { label: 'Email', value: email, href: `mailto:${email}` },
    { label: 'Phone', value: phone, href: `tel:${phone.replace(/[^0-9+]/g, '')}` },
    { label: 'LinkedIn', value: (linkedin || 'linkedin.com/company/datatrop').replace(/^https?:\/\//, ''), href: linkedin || '#' },
    { label: 'Location', value: location, href: null },
  ]

  return (
    <section id="contact" className="glow-section py-24 sm:py-32">
      <div className={WRAP}>
        {/* Native scheduler — writes straight into our Outlook calendar */}
        <div id="book" className="scroll-mt-24 grid lg:grid-cols-12 gap-10 mb-24">
          <div className="lg:col-span-4">
            <Eyebrow className="mb-5">Book a strategy call</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white tracking-[-0.03em] leading-[1.08] mb-4">Pick a time that works for you.</h2>
            <p className="text-white/55 font-light leading-relaxed">30 minutes with an engineer. Times are shown in IST and the invite lands straight in your calendar.</p>
          </div>
          <div className="lg:col-span-8 card overflow-hidden">
            <BookingWidget />
          </div>
        </div>

        <div ref={ref} className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Contact details */}
          <div className={`lg:col-span-4 ${reveal(inView)}`}>
            <Eyebrow className="mb-5">Or send a message</Eyebrow>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-white tracking-[-0.03em] leading-[1.08] mb-10">Tell us what's getting in the way.</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-y-7 gap-x-4">
              {info.map((it) => (
                <div key={it.label}>
                  <div className="font-mono text-[10px] text-white/40 uppercase tracking-[0.2em] mb-1.5">{it.label}</div>
                  {it.href
                    ? <a href={it.href} className="text-white text-sm hover:text-rose-soft transition-colors break-words">{it.value}</a>
                    : <div className="text-white text-sm break-words">{it.value}</div>}
                </div>
              ))}
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
  { title: 'Company', links: [['Who We Are', '#about'], ['How We Engage', '#engage'], ['Why Datatrop', '#why']] },
  { title: 'Capabilities', links: [['What We Build', '#capabilities'], ['AI Workforce', '#workforce'], ['What We Solve', '#solve'], ['Industries', '#industries']] },
  { title: 'Connect', links: [['Contact Us', '#contact'], ['Book a Call', '#book']] },
  { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']] },
]

function Footer({ settings }) {
  const company = settings.company_name || 'Datatrop AI Systems'
  const tagline = settings.tagline || 'Engineering Intelligence. Solving Complexity.'
  const location = settings.location || 'Kerala, India'
  const email = settings.contact_email || 'sales@datatrop.in'
  const linkedin = settings.linkedin_url || ''

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] pt-20 pb-10">
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
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} {company}. All rights reserved.</p>
          <p className="font-display text-white/40 text-[11px] uppercase tracking-[0.3em]">Engineering impossibilities to reality</p>
          <p className="text-white/40 text-xs">{location}</p>
        </div>
      </div>
    </footer>
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

export default function App() {
  const [settings, setSettings] = useState({})
  const [customers, setCustomers] = useState([])
  const [showcases, setShowcases] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [problems, setProblems] = useState(DEFAULT_PROBLEMS)
  const [serviceLines, setServiceLines] = useState(DEFAULT_SERVICE_LINES)

  useEffect(() => {
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
    api.getPublic('problems').then((d) => { if (Array.isArray(d) && d.length) setProblems(d) }).catch(() => {})
    api.getPublic('service_lines').then((d) => { if (Array.isArray(d) && d.length) setServiceLines(d) }).catch(() => {})
  }, [])

  return (
    <div className="site min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero headline={settings.hero_headline} subtext={settings.hero_subtext} />
      <Statement about={settings.about_bio} />
      <ThreePillars />
      <Workforce />
      <WhatWeBuild serviceLines={serviceLines} />
      <Approach />
      <WhatWeSolve problems={problems} />
      <Industries />
      {showcases.length > 0 && <Showcase items={showcases} />}
      {testimonials.length > 0 && <Testimonials items={testimonials} reviewsUrl={settings.google_reviews_url} />}
      {customers.length > 0 && <Clients customers={customers} />}
      <WhyDatatrop />
      <FinalCta />
      <Contact settings={settings} />
      <Footer settings={settings} />
    </div>
  )
}

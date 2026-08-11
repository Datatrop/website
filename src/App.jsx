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

const bookProps = BOOKING_URL
  ? { href: BOOKING_URL, target: '_blank', rel: 'noopener noreferrer' }
  : { href: '#book' }

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

  const inp = 'w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-black/10 text-[#0A2447] placeholder-slate-400 text-sm font-light focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] transition-colors'

  if (done) {
    return (
      <div className="p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full border border-[rgb(var(--accent)_/_0.3)] bg-[rgb(var(--accent)_/_0.08)] flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-[rgb(var(--accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-[#0A2447] text-xl font-normal mb-2">You're booked in</h3>
        <p className="text-slate-600 font-light">{done.when} at {done.time} IST</p>
        <p className="text-slate-500 text-sm font-light mt-3">A calendar invite is on its way to {form.email}.</p>
        {done.join && (
          <a href={done.join} target="_blank" rel="noopener noreferrer" className="inline-block mt-5 text-[rgb(var(--brand))] text-sm font-light hover:underline">Meeting link →</a>
        )}
      </div>
    )
  }

  if (offline) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-600 font-light">Online booking is temporarily unavailable.</p>
        <p className="text-slate-500 text-sm font-light mt-2">Please send us a message below and we'll arrange a time.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8">
      {/* Date strip */}
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Select a date</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-7">
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setDate(d.iso)}
            className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all ${
              date === d.iso
                ? 'border-[rgb(var(--brand)_/_0.5)] bg-[rgb(var(--brand)_/_0.08)] text-[#0A2447]'
                : 'border-black/10 text-slate-500 hover:border-black/20'
            }`}
          >
            <span className="block text-[10px] uppercase tracking-wide">{d.dow}</span>
            <span className="block text-lg font-light leading-tight">{d.day}</span>
            <span className="block text-[10px] text-slate-500">{d.mon}</span>
          </button>
        ))}
      </div>

      {/* Slots */}
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Available times · IST</p>
      {loadingSlots ? (
        <p className="text-slate-500 text-sm font-light py-6">Checking the calendar…</p>
      ) : slots && slots.length === 0 ? (
        <p className="text-slate-500 text-sm font-light py-6">No times left on this day. Try another date.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-7">
          {(slots || []).map((s) => (
            <button
              key={s.start}
              onClick={() => { setSlot(s); setErr('') }}
              className={`py-2.5 rounded-xl border text-sm font-light transition-all ${
                slot?.start === s.start
                  ? 'border-[rgb(var(--brand)_/_0.5)] bg-[rgb(var(--brand)_/_0.08)] text-[#0A2447]'
                  : 'border-black/10 text-slate-600 hover:border-black/20'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Details form, once a slot is chosen */}
      {slot && (
        <form onSubmit={submit} className="flex flex-col gap-4 pt-6 border-t border-black/[0.08]">
          <p className="text-slate-600 text-sm font-light">
            Booking <span className="text-[#0A2447]">{slot.label}</span> on{' '}
            <span className="text-[#0A2447]">{days.find((d) => d.iso === date)?.dow} {days.find((d) => d.iso === date)?.day} {days.find((d) => d.iso === date)?.mon}</span> · 30 min
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inp} />
            <input required type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inp} />
          </div>
          <input placeholder="Company (optional)" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={inp} />
          <textarea rows={3} placeholder="What would you like to discuss? (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${inp} resize-none`} />
          {err && <div className="text-red-600 text-xs px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">{err}</div>}
          <button type="submit" disabled={busy} className="w-full py-3.5 rounded-full bg-[rgb(var(--brand))] text-white font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Confirming…' : 'Confirm Booking'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Primary button ────────────────────────────────────────────────────────────
function BookButton({ children = 'Book Strategy Call', className = '' }) {
  return (
    <a
      {...bookProps}
      className={`inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[rgb(var(--brand))] hover:bg-[rgb(var(--brand))] text-white font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 shadow-[0_0_0_0_rgb(var(--brand)_/_0)] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] ${className}`}
    >
      {children}
    </a>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, intro, inView }) {
  return (
    <div className={`max-w-2xl mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-[rgb(var(--brand))] text-[11px] font-medium uppercase tracking-[0.25em] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-light text-[#0A2447] tracking-tight leading-[1.1]">
        {title}
      </h2>
      {intro && <p className="mt-5 text-slate-600 text-base sm:text-lg font-light leading-relaxed">{intro}</p>}
    </div>
  )
}

// ── Logo ──────────────────────────────────────────────────────────────────────
const _logoMods = import.meta.glob('./assets/datatrop-logo-transparent.png', { eager: true })
const logoSrc = _logoMods['./assets/datatrop-logo-transparent.png']?.default ?? null

function LogoMark({ footer = false }) {
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt="Datatrop AI Systems"
        className="w-auto object-contain"
        style={{ height: footer ? '30px' : '38px' }}
      />
    )
  }
  return (
    <div className="flex items-center gap-2.5">
      <div className={`rounded-lg bg-[rgb(var(--brand))] flex items-center justify-center ${footer ? 'w-6 h-6' : 'w-8 h-8'}`}>
        <span className={`text-white font-bold ${footer ? 'text-sm' : 'text-lg'}`}>D</span>
      </div>
      <span className={`text-[#0A2447] font-medium tracking-tight ${footer ? 'text-base' : 'text-xl'}`}>Datatrop</span>
    </div>
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
      { title: 'AI Workforce Platforms', desc: 'Multi-agent teams that execute operational work.', href: '#capabilities' },
      { title: 'Revenue Intelligence', desc: 'Lead intelligence and sales automation.', href: '#capabilities' },
      { title: 'Communication Intelligence', desc: 'Omnichannel, call and conversation intelligence.', href: '#capabilities' },
    ],
  },
  {
    label: 'About',
    href: '#about',
    panel: [
      { title: 'Who We Are', desc: 'Our engineering philosophy and approach.', href: '#about' },
      { title: 'Our Approach', desc: 'How we design and build intelligence layers.', href: '#approach' },
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
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled || openPanel || menuOpen ? 'bg-white/95 backdrop-blur-xl border-b border-black/[0.07] shadow-sm' : 'bg-white/80 backdrop-blur-md border-b border-black/[0.04]'}`}
      onMouseLeave={() => setOpenPanel(null)}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-20">
          <a href="#home"><LogoMark /></a>

          <div className="hidden md:flex items-center gap-1">
            {MEGA_MENU.map((m) => (
              <div key={m.label} onMouseEnter={() => setOpenPanel(m.label)}>
                <a
                  href={m.href}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-light transition-colors duration-200 ${openPanel === m.label ? 'text-[rgb(var(--brand))]' : 'text-slate-600 hover:text-[rgb(var(--brand))]'}`}
                >
                  {m.label}
                  <svg className={`w-3 h-3 transition-transform duration-200 ${openPanel === m.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
            ))}
            <a href="#contact" className="px-4 py-2.5 text-sm text-slate-600 hover:text-[rgb(var(--brand))] font-light transition-colors duration-200">Contact</a>
            <BookButton className="!px-5 !py-2 ml-3" />
          </div>

          <button onClick={() => setMenuOpen((o) => !o)} className="md:hidden p-2 text-[#0A2447]" aria-label="Menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Desktop mega-menu panel */}
        {openPanel && (
          <div className="hidden md:block border-t border-black/[0.06] py-8 anim-fade">
            <div className="grid grid-cols-4 gap-6">
              {MEGA_MENU.find((m) => m.label === openPanel)?.panel.map((p) => (
                <a key={p.title} href={p.href} onClick={() => setOpenPanel(null)} className="group p-4 rounded-xl hover:bg-[rgb(var(--brand)_/_0.05)] transition-colors">
                  <h4 className="text-[#0A2447] text-sm font-normal mb-1.5 group-hover:text-[rgb(var(--brand))] transition-colors">{p.title}</h4>
                  <p className="text-slate-500 text-xs font-light leading-relaxed">{p.desc}</p>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </nav>

    {menuOpen && (
      <div className="md:hidden fixed inset-x-0 top-20 z-40 bg-white border-b border-black/[0.07] shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="flex flex-col gap-1 px-5 pt-3 pb-8">
          {MEGA_MENU.map((m) => (
            <div key={m.label} className="border-b border-black/[0.06] py-1">
              <button
                onClick={() => setMobilePanel((p) => (p === m.label ? null : m.label))}
                className="w-full flex items-center justify-between px-2 py-2.5 text-sm text-[#0A2447] font-light"
              >
                {m.label}
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${mobilePanel === m.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobilePanel === m.label && (
                <div className="pb-3 pl-2 flex flex-col gap-1">
                  {m.panel.map((p) => (
                    <a key={p.title} href={p.href} onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm text-slate-600 hover:text-[rgb(var(--brand))] font-light">
                      {p.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a href="#contact" onClick={() => setMenuOpen(false)} className="px-2 py-3.5 text-sm text-[#0A2447] font-light border-b border-black/[0.06]">Contact</a>
          <div className="pt-4"><BookButton className="w-full" /></div>
        </div>
      </div>
    )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_HEADLINE = 'Engineering Intelligence for Complex Businesses.'
const DEFAULT_SUBTEXT =
  'When conventional software reaches its limits, we design AI-powered business systems that transform operational complexity into clarity, control, and autonomous execution.'

function Hero({ headline, subtext }) {
  const h = headline || DEFAULT_HEADLINE
  const s = subtext || DEFAULT_SUBTEXT

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-white">
      <div className="beam" style={{ animationDelay: '0s' }} />
      <div className="beam" style={{ animationDelay: '3s' }} />
      <div className="beam" style={{ animationDelay: '6s' }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 30% 40%, rgb(var(--brand) / 0.07) 0%, transparent 65%), radial-gradient(ellipse 50% 50% at 85% 70%, rgb(var(--accent) / 0.05) 0%, transparent 60%)' }}
      />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 w-full pt-28 pb-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/10 bg-[rgb(var(--brand)_/_0.04)] text-slate-600 text-xs font-light mb-8 anim-fade">
            <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))] animate-pulse" />
            AI-Powered Business Systems
          </span>

          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-light text-[#0A2447] leading-[1.05] tracking-[-0.02em] mb-7 anim-rise">
            {h}
          </h1>

          <p className="max-w-2xl text-base sm:text-xl text-slate-600 font-light leading-relaxed mb-10 anim-rise" style={{ animationDelay: '0.1s' }}>
            {s}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 anim-rise" style={{ animationDelay: '0.2s' }}>
            <BookButton />
            <a href="#capabilities" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-black/15 text-[#0A2447] font-light text-sm hover:bg-black/[0.03] hover:border-black/25 transition-all duration-200">
              Explore Our Systems
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BY THE NUMBERS — stat strip
// ═══════════════════════════════════════════════════════════════════════════════
const STATS = [
  { value: '5+', label: 'System categories engineered' },
  { value: '8', label: 'Industries served' },
  { value: '24/7', label: 'Autonomous execution' },
  { value: '100%', label: 'Built around the problem' },
]

function ByTheNumbers() {
  const [ref, inView] = useInView()
  return (
    <section className="relative bg-[#0A2447]" ref={ref}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`py-10 px-6 text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="text-3xl sm:text-4xl font-light text-white tracking-tight mb-2">{s.value}</div>
              <div className="text-slate-300 text-xs sm:text-sm font-light leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHO WE ARE  (About) — defined by what it is, not what it isn't
// ═══════════════════════════════════════════════════════════════════════════════
const PRINCIPLES = [
  'Engineered around the problem',
  'Systems over software',
  'Integration over isolation',
  'Measurable, lasting value',
]

// The technology ecosystem we combine into unified operational platforms
const TECHNOLOGIES = [
  'Artificial Intelligence',
  'Data Engineering',
  'Enterprise Software',
  'Cloud Infrastructure',
  'System Integrations',
  'Advanced Analytics',
]

const DEFAULT_ABOUT =
  'Datatrop AI Systems is a technology engineering company focused on solving the complex operational, analytical, and data-driven challenges that conventional software cannot adequately address.'

function WhoWeAre({ about }) {
  const [ref, inView] = useInView()
  return (
    <section id="about" className="py-28 bg-[#F4F6F9] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <div className={`grid lg:grid-cols-2 gap-14 items-start transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div>
            <span className="inline-flex items-center gap-2 text-[rgb(var(--brand))] text-[11px] font-medium uppercase tracking-[0.25em] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]" />
              Who We Are
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-light text-[#0A2447] tracking-tight leading-[1.12]">
              We engineer integrated technology ecosystems, not isolated tools.
            </h2>
          </div>
          <div>
            <p className="text-slate-700 text-lg font-light leading-relaxed mb-6">
              {about || DEFAULT_ABOUT}
            </p>
            <p className="text-slate-600 font-light leading-relaxed mb-6">
              We partner with organizations to design and build intelligent business systems tailored to their
              environments, where multiple processes, large volumes of data, and critical decisions converge.
              Artificial intelligence, data engineering, enterprise software, cloud infrastructure, integrations
              and analytics are combined into unified operational platforms.
            </p>
            <p className="text-slate-600 font-light leading-relaxed mb-8">
              Every solution is engineered around the problem, not around a particular technology. We select and
              integrate whatever best serves your objectives, turning fragmented processes into connected,
              intelligent and scalable systems.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {PRINCIPLES.map((p) => (
                <span key={p} className="text-sm px-4 py-2 rounded-full border border-black/10 bg-white text-slate-700 font-light">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Technology ecosystem */}
        <div className={`mt-16 pt-10 border-t border-black/[0.07] transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.25em] mb-5">Technologies we engineer with</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {TECHNOLOGIES.map((t) => (
              <span key={t} className="text-slate-600 text-sm font-light">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHAT WE SOLVE  (DB-backed problems, minimal cards)
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_PROBLEMS = [
  { id: 'p1', title: 'Fragmented Operations', description: 'Disconnected systems become one intelligent operating platform.' },
  { id: 'p2', title: 'Revenue Leakage', description: 'Capture every opportunity with AI-driven sales intelligence.' },
  { id: 'p3', title: 'Communication Chaos', description: 'Unify calls, messages, and customer interactions into one intelligent communication layer.' },
  { id: 'p4', title: 'Organizational Intelligence', description: 'Turn scattered knowledge into permanent institutional memory.' },
  { id: 'p5', title: 'Human Dependency', description: 'Deploy AI workforces that execute repetitive work while humans focus on strategy.' },
]

function WhatWeSolve({ problems }) {
  const [ref, inView] = useInView()
  return (
    <section id="solve" className="py-28 bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="What We Solve" title="The problems that break at scale." inView={inView} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-black/[0.06] rounded-2xl overflow-hidden border border-black/[0.06]">
          {problems.map((p, i) => (
            <div
              key={p.id}
              className={`group p-8 bg-white hover:bg-[#F4F6F9] transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className="text-[rgb(var(--accent)_/_0.75)] text-xs font-mono mb-5 tabular-nums">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="text-[#0A2447] text-lg font-normal mb-3">{p.title}</h3>
              <p className="text-slate-600 text-sm font-light leading-relaxed">{p.description || p.solution}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHAT WE BUILD  (Capabilities — DB-backed service lines, no pricing)
// ═══════════════════════════════════════════════════════════════════════════════
const CAP_ICONS = [
  'M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7h16M8 11h8M8 15h5',
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

function WhatWeBuild({ serviceLines }) {
  const [ref, inView] = useInView()
  const lead = serviceLines[0]
  const rest = serviceLines.slice(1)
  return (
    <section id="capabilities" className="py-28 bg-[#F4F6F9] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Capabilities" title="What we build." inView={inView} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lead tile — bold navy accent panel, LM homepage grid convention */}
          {lead && (
            <div
              className={`lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl border border-black/[0.06] min-h-[320px] flex flex-col justify-end p-8 transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ background: 'radial-gradient(ellipse 90% 80% at 20% 0%, rgb(var(--accent) / 0.28) 0%, transparent 60%), linear-gradient(160deg, #0A2447 0%, #071831 100%)' }}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-xl border border-white/15 bg-white/10 flex items-center justify-center text-white mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d={CAP_ICONS[0]} />
                  </svg>
                </div>
                <h3 className="text-white text-2xl font-light mb-3">{lead.name}</h3>
                <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed max-w-md">{lead.examples}</p>
              </div>
            </div>
          )}
          {rest.map((s, i) => (
            <div
              key={s.id}
              className={`p-7 rounded-2xl border border-black/[0.07] bg-white hover:border-[rgb(var(--brand)_/_0.3)] hover:shadow-md transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${(i + 1) * 70}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-[rgb(var(--brand)_/_0.06)] flex items-center justify-center text-[rgb(var(--brand))] mb-5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d={CAP_ICONS[(i + 1) % CAP_ICONS.length]} />
                </svg>
              </div>
              <h3 className="text-[#0A2447] text-base font-normal mb-2.5">{s.name}</h3>
              <p className="text-slate-600 text-sm font-light leading-relaxed">{s.examples}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDUSTRIES
// ═══════════════════════════════════════════════════════════════════════════════
const INDUSTRIES = ['Manufacturing', 'Distribution', 'Trading', 'Healthcare', 'Financial Services', 'Retail', 'Automotive', 'Logistics']

function Industries() {
  const [ref, inView] = useInView()
  return (
    <section id="industries" className="py-28 bg-[#F5F7FA] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Industries" title="Built for complex, growing organizations." inView={inView} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/[0.06] rounded-2xl overflow-hidden border border-black/[0.06]">
          {INDUSTRIES.map((ind, i) => (
            <div
              key={ind}
              className={`px-6 py-8 bg-white hover:bg-[#EDF1F7] text-center transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <span className="text-slate-700 text-sm font-light">{ind}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUR APPROACH
// ═══════════════════════════════════════════════════════════════════════════════
const APPROACH = [
  { step: 'Understand', desc: 'Study the business: how it operates, where it breaks, what it needs.' },
  { step: 'Architect', desc: 'Design the intelligence layer that will run underneath it.' },
  { step: 'Engineer', desc: 'Build enterprise-grade systems, integrated end-to-end.' },
  { step: 'Evolve', desc: 'Continuously improve the system as your business and AI advance.' },
]

function Approach() {
  const [ref, inView] = useInView()
  return (
    <section id="approach" className="py-28 bg-[#EDF1F7] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Our Approach" title="How we engineer intelligence." inView={inView} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {APPROACH.map((a, i) => (
            <div
              key={a.step}
              className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[rgb(var(--accent))] font-mono text-sm tabular-nums">0{i + 1}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-[rgb(var(--brand)_/_0.3)] to-transparent" />
              </div>
              <h3 className="text-[#0A2447] text-lg font-normal mb-2">{a.step}</h3>
              <p className="text-slate-600 text-sm font-light leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY DATATROP
// ═══════════════════════════════════════════════════════════════════════════════
function WhyDatatrop() {
  const [ref, inView] = useInView()
  return (
    <section id="why" className="py-28 bg-[#F5F7FA] border-t border-black/[0.05]">
      <div className={`max-w-4xl mx-auto px-5 sm:px-8 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} ref={ref}>
        <span className="inline-flex items-center gap-2 text-[rgb(var(--brand))] text-[11px] font-medium uppercase tracking-[0.25em] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]" />
          Why Datatrop
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-light text-[#0A2447] tracking-tight leading-[1.15] mb-6">
          Every solution is engineered around the problem, not around a particular technology.
        </h2>
        <p className="text-slate-600 text-lg font-light leading-relaxed mb-10">
          We specialise in engineering bespoke systems where off-the-shelf software falls short. Whether the challenge
          involves complex data flows, enterprise operations, decision intelligence or digital transformation, we select
          and integrate the technologies that best address your objectives, converting complexity into clarity, and
          delivering measurable, lasting business value.
        </p>
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          {['We engineer systems.', 'We solve complexity.', 'We enable intelligent enterprises.'].map((line) => (
            <span key={line} className="text-[#0A2447] text-lg font-light">{line}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISION
// ═══════════════════════════════════════════════════════════════════════════════
function Vision() {
  const [ref, inView] = useInView()
  return (
    <section className="py-32 bg-[#0A2447] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 40%, rgb(var(--accent) / 0.16) 0%, transparent 65%)' }} />
      <div className={`relative max-w-4xl mx-auto px-5 sm:px-8 text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} ref={ref}>
        <span className="block text-[rgb(var(--accent))] text-[11px] font-medium uppercase tracking-[0.25em] mb-8">Vision</span>
        <p className="text-2xl sm:text-3xl lg:text-[40px] font-light text-white leading-[1.28] tracking-tight">
          To become the company organizations turn to when business complexity exceeds the capability of
          <span className="text-[rgb(var(--accent))]"> conventional software.</span>
        </p>
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
    <section className="py-28 bg-[#F5F7FA] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Systems in the Field" title="Intelligence we've shipped." inView={inView} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div key={item.id} className={`p-7 rounded-2xl border border-black/[0.07] bg-white hover:border-[rgb(var(--brand)_/_0.3)] hover:shadow-md transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 70}ms` }}>
              <h3 className="text-[#0A2447] text-base font-normal mb-2">{item.title}</h3>
              {item.description && <p className="text-slate-600 text-sm font-light leading-relaxed mb-4">{item.description}</p>}
              {(Array.isArray(item.tags) ? item.tags : []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-black/10 text-slate-500">{t}</span>
                  ))}
                </div>
              )}
              {item.demo_url && (
                <a href={item.demo_url} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] text-xs font-light">View demo →</a>
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
    <section className="py-28 bg-[#EDF1F7] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Clients" title="Who we work with." inView={inView} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c, i) => (
            <div key={c.id} className={`p-6 rounded-2xl border border-black/[0.07] bg-white transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${i * 60}ms` }}>
              <p className="text-[#0A2447] text-sm font-normal">{c.name}</p>
              {c.company && <p className="text-slate-500 text-xs mt-0.5 font-light">{c.company}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL CTA + CONTACT / BOOKING
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
  const inp = 'w-full px-4 py-3 rounded-xl bg-[#F5F7FA] border border-black/10 text-[#0A2447] placeholder-slate-400 text-sm font-light focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] transition-colors'

  const info = [
    { label: 'Email', value: email, href: `mailto:${email}` },
    { label: 'Phone', value: phone, href: `tel:${phone.replace(/[^0-9+]/g, '')}` },
    { label: 'LinkedIn', value: (linkedin || 'linkedin.com/company/datatrop').replace(/^https?:\/\//, ''), href: linkedin || '#' },
    { label: 'Location', value: location, href: null },
  ]

  return (
    <section id="contact" className="py-28 bg-[#F5F7FA] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* Final CTA */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-light text-[#0A2447] tracking-tight leading-[1.12] mb-5">
            Ready to engineer your next competitive advantage?
          </h2>
          <p className="text-slate-600 text-lg font-light leading-relaxed mb-9">
            Let's discuss your business, your challenges, and the systems that will define your next decade.
          </p>
          <BookButton>Book Strategy Call</BookButton>
        </div>

        {/* Native scheduler — writes straight into our Outlook calendar */}
        <div id="book" className="mb-20 max-w-3xl mx-auto">
          <h3 className="text-center text-[#0A2447] text-lg font-normal mb-2">Pick a time that works for you</h3>
          <p className="text-center text-slate-500 text-sm font-light mb-7">30-minute strategy call · times shown in IST</p>
          <div className="rounded-2xl overflow-hidden border border-black/[0.07] bg-white shadow-lg">
            <BookingWidget />
          </div>
        </div>

        <div ref={ref} className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Contact details */}
          <div className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="inline-flex items-center gap-2 text-[rgb(var(--brand))] text-[11px] font-medium uppercase tracking-[0.25em] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]" />
              Contact
            </span>
            <div className="grid grid-cols-2 gap-y-8 gap-x-4">
              {info.map((it) => (
                <div key={it.label}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">{it.label}</div>
                  {it.href
                    ? <a href={it.href} className="text-[#0A2447] text-sm font-light hover:text-[rgb(var(--brand))] transition-colors break-words">{it.value}</a>
                    : <div className="text-[#0A2447] text-sm font-light break-words">{it.value}</div>}
                </div>
              ))}
            </div>
            <div className="mt-10 p-5 rounded-2xl border border-black/[0.07] bg-white">
              <p className="text-slate-600 text-sm font-light leading-relaxed">
                Prefer to talk directly? A strategy call is the fastest way to see whether Datatrop is the right fit for your organization.
              </p>
            </div>
          </div>

          {/* Message form (alternative to booking a time above) */}
          <div className={`transition-all duration-700 delay-100 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="inline-flex items-center gap-2 text-[rgb(var(--brand))] text-[11px] font-medium uppercase tracking-[0.25em] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent))]" />
              Or send a message
            </span>
            <div className="p-8 rounded-2xl border border-black/[0.07] bg-white shadow-lg">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full border border-[rgb(var(--accent)_/_0.3)] bg-[rgb(var(--accent)_/_0.08)] flex items-center justify-center mb-5">
                    <svg className="w-6 h-6 text-[rgb(var(--accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-[#0A2447] text-lg font-normal mb-2">Request received</h3>
                  <p className="text-slate-600 text-sm font-light">We'll reach out within 24 hours to schedule your session.</p>
                  <button onClick={() => setSubmitted(false)} className="mt-6 text-[rgb(var(--brand))] hover:text-[rgb(var(--accent))] text-sm font-light">Send another →</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <input name="name" value={form.name} onChange={set} required placeholder="Name" className={inp} />
                    <input name="company" value={form.company} onChange={set} placeholder="Company" className={inp} />
                  </div>
                  <input type="email" name="email" value={form.email} onChange={set} required placeholder="Work email" className={inp} />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <select name="industry" value={form.industry} onChange={set} className={inp}>
                      <option value="">Industry</option>
                      {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select name="size" value={form.size} onChange={set} className={inp}>
                      <option value="">Company size</option>
                      {SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o} employees</option>)}
                    </select>
                  </div>
                  <textarea name="challenge" value={form.challenge} onChange={set} required rows={4} placeholder="Briefly describe your biggest operational challenge" className={`${inp} resize-none`} />
                  {err && (
                    <div className="text-red-600 text-xs px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">{err}</div>
                  )}
                  <button type="submit" disabled={submitting} className="w-full py-3.5 rounded-full bg-[rgb(var(--brand))] hover:bg-[rgb(var(--brand))] text-white font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </div>
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

function Testimonials({ items, reviewsUrl }) {
  const [ref, inView] = useInView()
  const rated = items.filter((t) => Number(t.rating) > 0)
  const avg = rated.length ? (rated.reduce((a, t) => a + Number(t.rating), 0) / rated.length).toFixed(1) : null

  return (
    <section className="py-28 bg-[#EDF1F7] border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8" ref={ref}>
        <SectionHead eyebrow="Client Feedback" title="What our clients say." inView={inView} />

        {/* Rating summary */}
        {avg && (
          <div className={`flex items-center gap-3 -mt-8 mb-10 transition-all duration-700 ${inView ? 'opacity-100' : 'opacity-0'}`}>
            <GoogleG className="w-5 h-5" />
            <span className="text-[#0A2447] text-lg font-light">{avg}</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <svg key={s} className={`w-4 h-4 ${s < Math.round(avg) ? 'text-[rgb(var(--accent))]' : 'text-black/10'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.33 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.95z" />
                </svg>
              ))}
            </div>
            <span className="text-slate-500 text-sm font-light">from {rated.length} review{rated.length === 1 ? '' : 's'}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t, i) => (
            <figure
              key={t.id}
              className={`flex flex-col p-7 rounded-2xl border border-black/[0.07] bg-white transition-all duration-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              {Number(t.rating) > 0 && (
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg key={s} className={`w-4 h-4 ${s < Number(t.rating) ? 'text-[rgb(var(--accent))]' : 'text-black/10'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.28 3.95a1 1 0 00.95.69h4.15c.97 0 1.37 1.24.59 1.81l-3.36 2.44a1 1 0 00-.36 1.12l1.28 3.95c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.95a1 1 0 00-.36-1.12L2.33 9.38c-.78-.57-.38-1.81.59-1.81h4.15a1 1 0 00.95-.69l1.28-3.95z" />
                    </svg>
                  ))}
                </div>
              )}
              <blockquote className="text-slate-700 text-base font-light leading-relaxed flex-1">"{t.quote}"</blockquote>
              <figcaption className="mt-6 pt-5 border-t border-black/[0.06] flex items-end justify-between gap-3">
                <div>
                  <div className="text-[#0A2447] text-sm font-normal">{t.name}</div>
                  {(t.role || t.company) && (
                    <div className="text-slate-500 text-xs font-light mt-0.5">
                      {[t.role, t.company].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                {t.source === 'Google' && (
                  <span className="flex items-center gap-1.5 text-slate-500 text-[11px] font-light flex-shrink-0" title="Review from Google">
                    <GoogleG />
                    Google
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>

        {reviewsUrl && (
          <div className="text-center mt-10">
            <a
              href={reviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-black/15 text-[#0A2447] text-sm font-light hover:bg-black/[0.03] hover:border-black/25 transition-all"
            >
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
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
const FOOTER_COLUMNS = [
  { title: 'Company', links: [['Who We Are', '#about'], ['Our Approach', '#approach'], ['Why Datatrop', '#why']] },
  { title: 'Capabilities', links: [['What We Build', '#capabilities'], ['What We Solve', '#solve'], ['Industries', '#industries']] },
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
    <footer className="pt-16 pb-10 bg-[#EDF1F7] border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-10 pb-14 border-b border-black/[0.07]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <LogoMark footer />
            <p className="text-slate-600 text-sm font-light mt-4 max-w-xs">{tagline}</p>
            <div className="flex items-center gap-3 mt-6">
              <a href={`mailto:${email}`} className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-slate-500 hover:text-[rgb(var(--brand))] hover:border-[rgb(var(--brand)_/_0.4)] transition-colors" aria-label="Email">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </a>
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-slate-500 hover:text-[rgb(var(--brand))] hover:border-[rgb(var(--brand)_/_0.4)] transition-colors" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z" /></svg>
                </a>
              )}
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4">{col.title}</h4>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([l, h]) => (
                  <a key={l} href={h} className="text-slate-600 hover:text-[rgb(var(--brand))] text-sm font-light transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs font-light">© 2026 {company}. All rights reserved.</p>
          <p className="text-slate-500 text-xs font-light">{location}</p>
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
    <div className="min-h-screen bg-[#F5F7FA]">
      <Navbar />
      <Hero headline={settings.hero_headline} subtext={settings.hero_subtext} />
      <ByTheNumbers />
      <WhoWeAre about={settings.about_bio} />
      <WhatWeSolve problems={problems} />
      <WhatWeBuild serviceLines={serviceLines} />
      <Industries />
      <Approach />
      <WhyDatatrop />
      {showcases.length > 0 && <Showcase items={showcases} />}
      {testimonials.length > 0 && <Testimonials items={testimonials} reviewsUrl={settings.google_reviews_url} />}
      {customers.length > 0 && <Clients customers={customers} />}
      <Vision />
      <Contact settings={settings} />
      <Footer settings={settings} />
    </div>
  )
}

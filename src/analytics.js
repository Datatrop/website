// Google Analytics 4, loaded only when a measurement ID is configured at build
// time (VITE_GA_MEASUREMENT_ID, set as a GitHub Actions variable for deploys)
// AND the visitor has accepted analytics cookies in the consent banner.
// Until both are true every call here is a no-op: no script, no cookies, no data.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const CONSENT_KEY = 'datatrop_analytics_consent'
let started = false

// True when the site has analytics configured, i.e. there is something to consent to
export const analyticsAvailable = Boolean(GA_ID)

// 'granted' | 'denied' | null (not asked yet)
export function getConsent() {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function setConsent(value) {
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* storage blocked: choice lasts this visit */ }
  if (value === 'granted') initAnalytics(true)
  // Declining after accepting: stop sending and let the cookies lapse. GA's
  // cookies are first-party, so clear them now rather than waiting.
  if (value === 'denied' && started) {
    window[`ga-disable-${GA_ID}`] = true
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n === '_ga' || n.startsWith('_ga_'))
      .forEach((n) => {
        const host = window.location.hostname.replace(/^www\./, '')
        document.cookie = `${n}=; Max-Age=0; path=/`
        document.cookie = `${n}=; Max-Age=0; path=/; domain=.${host}`
      })
  }
}

export function initAnalytics(consented = getConsent() === 'granted') {
  if (!GA_ID || !consented || typeof window === 'undefined') return
  window[`ga-disable-${GA_ID}`] = false
  if (started) return
  started = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  // Page views are sent manually on every in-app page change (see trackPageView)
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(s)
}

export function trackPageView(path, title) {
  if (!started) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title,
  })
}

// Named events used across the site:
//   book_call_click   any "Book a call" button        { location }
//   message_click     any "Send a message" button     { location }
//   contact_click     email / phone link              { method: 'email' | 'phone' }
//   book_call         a booking was confirmed          (mark as a key event in GA4)
//   generate_lead     the message form was sent        (mark as a key event in GA4)
export function track(event, params = {}) {
  if (!started) return
  window.gtag('event', event, params)
}

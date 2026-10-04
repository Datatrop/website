// Google Analytics 4, loaded only when a measurement ID is configured at build
// time (VITE_GA_MEASUREMENT_ID, set as a GitHub Actions variable for deploys).
// Without an ID every call here is a no-op, so local dev and the approval
// preview never send data.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
let started = false

export function initAnalytics() {
  if (!GA_ID || started || typeof window === 'undefined') return
  started = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  // Page views are sent manually on every in-app page change (see trackPageView)
  window.gtag('config', GA_ID, { send_page_view: false })
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

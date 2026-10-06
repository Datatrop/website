// Tiny fetch client for the Datatrop PHP API (replaces the Supabase client).
// Same-origin: the React app and /api/*.php are served from the same domain,
// so the admin session cookie rides along automatically.

const BASE = '/api'

async function req(url, { method = 'GET', body } = {}) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'fetch' },
  }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(url, opts)
  let data = null
  try { data = await res.json() } catch { /* no/invalid JSON body */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  // ── Public content (no auth) ──────────────────────────────────────────────
  getContent: () => req(`${BASE}/public.php?resource=site_content`),
  getPublic: (resource) => req(`${BASE}/public.php?resource=${resource}`),

  // ── Public lead submission (contact / strategy-call form) ─────────────────
  submitLead: (payload) => req(`${BASE}/leads.php`, { method: 'POST', body: payload }),

  // ── Public booking (writes straight into the Outlook calendar) ────────────
  bookingSlots: (date) => req(`${BASE}/book.php?action=slots&date=${encodeURIComponent(date)}`),
  createBooking: (payload) => req(`${BASE}/book.php?action=create`, { method: 'POST', body: payload }),

  // ── Admin CRUD (session required) ─────────────────────────────────────────
  list: (resource) => req(`${BASE}/admin.php?resource=${resource}`),
  getSingle: (resource) => req(`${BASE}/admin.php?resource=${resource}`),
  create: (resource, payload) =>
    req(`${BASE}/admin.php?resource=${resource}`, { method: 'POST', body: payload }),
  update: (resource, id, payload) =>
    req(`${BASE}/admin.php?resource=${resource}&id=${id}`, { method: 'PUT', body: payload }),
  remove: (resource, id) =>
    req(`${BASE}/admin.php?resource=${resource}&id=${id}`, { method: 'DELETE' }),
  // Image upload (multipart): resolves to { url: '/uploads/…' }
  uploadImage: async (file) => {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${BASE}/upload.php`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch' }, body })
    let data = null
    try { data = await res.json() } catch { /* no/invalid JSON body */ }
    if (!res.ok) throw new Error((data && data.error) || `Upload failed (${res.status})`)
    return data
  },
  saveContent: (payload) =>
    req(`${BASE}/admin.php?resource=site_content`, { method: 'PUT', body: payload }),

  // ── Microsoft Outlook integration (admin) ─────────────────────────────────
  msStatus: () => req(`${BASE}/ms.php?action=status`),
  msDisconnect: () => req(`${BASE}/ms.php?action=disconnect`, { method: 'POST', body: {} }),
  msInbox: () => req(`${BASE}/ms.php?action=inbox`),
  msEvents: () => req(`${BASE}/ms.php?action=events`),
  msTestEmail: () => req(`${BASE}/ms.php?action=test_email`, { method: 'POST', body: {} }),
  msCreateEvent: (payload) => req(`${BASE}/ms.php?action=create_event`, { method: 'POST', body: payload }),
  msConnectUrl: () => `${BASE}/ms_connect.php`,

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (email, password) =>
    req(`${BASE}/auth.php?action=login`, { method: 'POST', body: { email, password } }),
  logout: () => req(`${BASE}/auth.php?action=logout`, { method: 'POST', body: {} }),
  me: () => req(`${BASE}/auth.php?action=me`),
}

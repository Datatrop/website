import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const card = 'p-6 rounded-2xl border border-[#1a1a1a] bg-[#090909]'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null) // {type, text}
  const [busy, setBusy] = useState('')
  const [inbox, setInbox] = useState(null)
  const [events, setEvents] = useState(null)

  const loadStatus = useCallback(async () => {
    try { setStatus(await api.msStatus()) } catch { setStatus(null) }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Surface the result of the OAuth redirect
    const q = new URLSearchParams(window.location.search)
    if (q.get('ms_connected')) setBanner({ type: 'ok', text: 'Outlook connected successfully.' })
    if (q.get('ms_error')) setBanner({ type: 'err', text: q.get('ms_error') })
    if (q.get('ms_connected') || q.get('ms_error')) {
      window.history.replaceState({}, '', '/admin/integrations')
    }
    loadStatus()
  }, [loadStatus])

  const connect = () => { window.location.href = api.msConnectUrl() }

  const disconnect = async () => {
    if (!confirm('Disconnect Outlook? The website will stop sending lead notifications.')) return
    setBusy('disconnect')
    try { await api.msDisconnect(); setBanner({ type: 'ok', text: 'Outlook disconnected.' }); setInbox(null); setEvents(null); loadStatus() }
    catch (e) { setBanner({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  const testEmail = async () => {
    setBusy('test')
    try { const r = await api.msTestEmail(); setBanner({ type: 'ok', text: `Test email sent to ${r.sent_to}.` }) }
    catch (e) { setBanner({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  const loadInbox = async () => {
    setBusy('inbox')
    try { setInbox(await api.msInbox()) }
    catch (e) { setBanner({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  const loadEvents = async () => {
    setBusy('events')
    try { setEvents(await api.msEvents()) }
    catch (e) { setBanner({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')

  if (loading) return <div className="max-w-3xl"><div className="h-40 rounded-2xl bg-[#090909] border border-[#1a1a1a] animate-pulse" /></div>

  const connected = status?.connected
  const configured = status?.configured

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Connect Outlook to get lead notifications, read your inbox and see your calendar.</p>
      </div>

      {banner && (
        <div className={`mb-5 px-4 py-3 rounded-xl text-sm border ${banner.type === 'ok' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
          {banner.text}
        </div>
      )}

      {/* Connection card */}
      <div className={card}>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/[0.08] border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold">Microsoft Outlook</h2>
              {connected ? (
                <>
                  <p className="text-green-400 text-sm mt-1">● Connected</p>
                  <p className="text-gray-400 text-sm mt-1">{status.account_email}</p>
                </>
              ) : (
                <p className="text-gray-500 text-sm mt-1">
                  {configured ? 'Not connected yet.' : 'Microsoft credentials are not set in api/config.php yet.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {connected ? (
              <>
                <button onClick={testEmail} disabled={busy === 'test'} className="px-4 py-2.5 rounded-xl border border-[#222] text-gray-300 hover:text-white hover:border-[#333] text-sm font-medium transition-colors disabled:opacity-50">
                  {busy === 'test' ? 'Sending…' : 'Send test email'}
                </button>
                <button onClick={disconnect} disabled={busy === 'disconnect'} className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors disabled:opacity-50">
                  Disconnect
                </button>
              </>
            ) : (
              <button onClick={connect} disabled={!configured} className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed btn-cyan-glow">
                Connect Outlook
              </button>
            )}
          </div>
        </div>

        {connected && (
          <p className="text-gray-600 text-xs mt-5 pt-5 border-t border-[#1a1a1a]">
            New website leads are emailed to {status.account_email} automatically. Token auto-renews; connected {status.connected_at ? new Date(status.connected_at.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN') : '—'}.
          </p>
        )}
      </div>

      {connected && (
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          {/* Inbox */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Recent inbox</h3>
              <button onClick={loadInbox} disabled={busy === 'inbox'} className="text-blue-400 hover:text-blue-500 text-xs disabled:opacity-50">
                {busy === 'inbox' ? 'Loading…' : inbox ? 'Refresh' : 'Load'}
              </button>
            </div>
            {!inbox ? (
              <p className="text-gray-600 text-xs">Click load to fetch your latest messages.</p>
            ) : inbox.length === 0 ? (
              <p className="text-gray-600 text-xs">No messages.</p>
            ) : (
              <ul className="divide-y divide-[#0f0f0f]">
                {inbox.map((m) => (
                  <li key={m.id} className="py-3">
                    <p className={`text-sm truncate ${m.isRead ? 'text-gray-400' : 'text-white font-medium'}`}>{m.subject || '(no subject)'}</p>
                    <p className="text-gray-600 text-xs mt-0.5 truncate">{m.from?.emailAddress?.address} · {fmt(m.receivedDateTime)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Calendar */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Upcoming events</h3>
              <button onClick={loadEvents} disabled={busy === 'events'} className="text-blue-400 hover:text-blue-500 text-xs disabled:opacity-50">
                {busy === 'events' ? 'Loading…' : events ? 'Refresh' : 'Load'}
              </button>
            </div>
            {!events ? (
              <p className="text-gray-600 text-xs">Click load to see the next 30 days.</p>
            ) : events.length === 0 ? (
              <p className="text-gray-600 text-xs">Nothing scheduled.</p>
            ) : (
              <ul className="divide-y divide-[#0f0f0f]">
                {events.map((ev) => (
                  <li key={ev.id} className="py-3">
                    <p className="text-white text-sm truncate">{ev.subject || '(no title)'}</p>
                    <p className="text-gray-600 text-xs mt-0.5">{fmt(ev.start?.dateTime)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!configured && (
        <div className="mt-5 px-4 py-3 rounded-xl border border-[#1a1a1a] bg-[#0c0c0c] text-gray-500 text-xs leading-relaxed">
          To enable this, add your Azure app's <span className="font-mono text-gray-400">ms_client_id</span>,
          <span className="font-mono text-gray-400"> ms_tenant_id</span> and
          <span className="font-mono text-gray-400"> ms_client_secret</span> to <span className="font-mono text-gray-400">public_html/api/config.php</span>,
          and register the redirect URI <span className="font-mono text-gray-400">https://datatrop.in/auth/microsoft/callback</span>.
        </div>
      )}
    </div>
  )
}

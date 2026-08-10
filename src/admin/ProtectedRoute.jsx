import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let settled = false
    const finish = (val) => {
      if (settled) return
      settled = true
      setAuthed(val)
      setLoading(false)
    }
    api.me().then(() => finish(true)).catch(() => finish(false))
    // Safety net: if the backend is unreachable, don't hang on "Authenticating…"
    // forever — fall through to the login screen.
    const timer = setTimeout(() => finish(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-500 text-sm animate-pulse">Authenticating…</div>
      </div>
    )
  }
  if (!authed) return <Navigate to="/admin/login" replace />
  return children
}

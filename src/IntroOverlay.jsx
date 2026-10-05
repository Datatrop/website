// Full-screen brand intro shown each time someone comes to the site (once per
// browser session, so refreshing during a visit doesn't replay it).
// The decision is made before React boots by a tiny inline script in
// index.html, which adds `intro-playing` to <html> (hiding the site and
// pausing its entrance animations) unless it already played this session or
// the visitor asked for reduced motion. This component plays the video
// and removes that class when it ends, is skipped, or fails to start.
import { useEffect, useRef, useState } from 'react'
import introVideo from './assets/intro.mp4'
import introPoster from './assets/intro-poster.jpg'

const INTRO_PLAYED_KEY = 'datatrop_intro_played'
const FADE_MS = 700

const introRequested = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('intro-playing')

export default function IntroOverlay() {
  const video = useRef(null)
  const [show, setShow] = useState(introRequested)
  const [leaving, setLeaving] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    try { sessionStorage.setItem(INTRO_PLAYED_KEY, '1') } catch { /* storage blocked: may replay on refresh */ }
    setLeaving(true)
    // Reveal the site underneath while the overlay fades out
    document.documentElement.classList.remove('intro-playing')
    setTimeout(() => setShow(false), FADE_MS)
  }

  useEffect(() => {
    if (!show) return
    const v = video.current
    document.body.style.overflow = 'hidden'
    // Never trap a visitor: bail out if playback doesn't start promptly
    const startGuard = setTimeout(() => { if (!v || v.currentTime === 0) finish() }, 3500)
    const hardStop = setTimeout(finish, 14000)
    const p = v && v.play()
    if (p && p.catch) p.catch(finish)
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish() }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(startGuard); clearTimeout(hardStop)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [show])

  if (!show) return null

  const toggleSound = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <div
      className={`intro-overlay fixed inset-0 z-[100] bg-[#050204] transition-opacity ease-out ${leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-label="Datatrop intro video"
    >
      <video
        ref={video}
        src={introVideo}
        poster={introPoster}
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
        onError={finish}
        onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
        className="intro-video absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      <div className="absolute top-0 inset-x-0 flex items-center justify-end gap-2 p-4 sm:p-6" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          className="w-11 h-11 rounded-full border border-white/20 bg-black/40 backdrop-blur text-white/80 hover:text-white hover:border-white/40 flex items-center justify-center transition-colors"
        >
          {muted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M11 5L6 9H3v6h3l5 4V5zM22 9l-6 6M16 9l6 6" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={finish}
          className="h-11 px-5 rounded-full border border-white/20 bg-black/40 backdrop-blur text-white text-sm hover:border-white/40 transition-colors"
        >
          Skip intro
        </button>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
        <div className="h-full bg-[linear-gradient(90deg,#8A2A91,#E0457B)]" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  )
}

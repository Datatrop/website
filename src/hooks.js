import { useState, useEffect, useRef } from 'react'

// Becomes true once the element scrolls into view (then stays true)
export function useInView(threshold = 0.14) {
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

// True while the element is on screen; used to pause animation loops off-screen
export function useOnScreen(threshold = 0.1) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, on]
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 0 → 1 as the visitor scrolls through a tall section whose inner content is
// position: sticky. 0 when the section's top reaches the viewport top, 1 when
// its bottom reaches the viewport bottom.
export function useStickyProgress() {
  const ref = useRef(null)
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      setP(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf) }
  }, [])
  return [ref, p]
}

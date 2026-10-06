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

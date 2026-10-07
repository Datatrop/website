// About → Who we are: complexity turning into order as you scroll.
// `p` (0..1) moves every signal from a tangled, flickering scatter (amber
// warning colours, random crossed links) into one calm lattice around a
// glowing core, with the four principles as its hubs. Drawn on canvas with
// additive glow; animates only while on screen.
import { useEffect, useRef } from 'react'

const N = 84
const HUBS = 4

function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

// Chaos and order positions are in a -1..1 box
const NODES = (() => {
  const r = rng(11)
  return Array.from({ length: N }, (_, i) => {
    let ox, oy, ring
    if (i < HUBS) {
      // the four principle hubs sit on a diamond around the core
      const a = -Math.PI / 2 + (i * Math.PI) / 2 + Math.PI / 4
      ox = Math.cos(a) * 0.62; oy = Math.sin(a) * 0.62; ring = 1
    } else {
      // the rest form two even rings plus an outer shell
      const k = i - HUBS
      const rings = [[12, 0.32], [24, 0.62], [44, 0.9]]
      let idx = k, ri = 0
      while (ri < rings.length - 1 && idx >= rings[ri][0]) { idx -= rings[ri][0]; ri++ }
      const [count, rad] = rings[ri]
      const a = (idx / count) * Math.PI * 2 + (ri % 2 ? Math.PI / count : 0)
      ox = Math.cos(a) * rad; oy = Math.sin(a) * rad; ring = ri
    }
    return {
      cx: (r() * 2 - 1) * 0.95, cy: (r() * 2 - 1) * 0.95,
      ox, oy, ring, ph: r() * 6.28, sp: 0.6 + r() * 1.4,
      warm: r() < 0.55,
    }
  })
})()

// Tangled links in chaos: random pairs. Ordered links: neighbours on rings + spokes.
const CHAOS_LINKS = (() => {
  const r = rng(5), out = []
  for (let i = 0; i < 70; i++) out.push([Math.floor(r() * N), Math.floor(r() * N)])
  return out
})()
const ORDER_LINKS = (() => {
  const out = []
  const byRing = [[], [], []]
  NODES.forEach((n, i) => { if (i >= HUBS) byRing[n.ring].push(i) })
  byRing.forEach((ids) => ids.forEach((id, k) => out.push([id, ids[(k + 1) % ids.length]])))
  // each hub links to its nearest nodes on the inner and middle rings
  for (let h = 0; h < HUBS; h++) {
    const d = (j) => Math.hypot(NODES[j].ox - NODES[h].ox, NODES[j].oy - NODES[h].oy)
    ;[...byRing[0], ...byRing[1]].sort((a, b) => d(a) - d(b)).slice(0, 4).forEach((j) => out.push([h, j]))
  }
  byRing[0].forEach((id) => out.push([-1, id])) // -1 = the core
  return out
})()

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const mix = (a, b, t) => a + (b - a) * t
const AMBER = [246, 196, 83], RED = [232, 90, 70], ROSE = [224, 69, 123], SOFT = [240, 141, 176], WHITE = [255, 236, 246]
const col = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const blend = (a, b, t) => a.map((v, i) => Math.round(mix(v, b[i], t)))

export default function OrderViz({ p, hubsRef }) {
  const canvas = useRef(null)
  const pRef = useRef(p)
  useEffect(() => { pRef.current = p }, [p])

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, raf = 0, visible = false
    const t0 = performance.now()

    const draw = () => {
      const t = still ? 0 : (performance.now() - t0) / 1000
      const q = ease(Math.min(1, Math.max(0, pRef.current)))
      const S = Math.min(W, H) * 0.46, X = W / 2, Y = H / 2
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, el.width, el.height)
      const dpr = el.width / W
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'lighter'

      // positions: chaos jitters hard, order breathes gently
      const pos = NODES.map((n) => {
        const j = (1 - q) * 0.06
        const x = mix(n.cx + Math.sin(t * n.sp * 2.3 + n.ph) * j, n.ox * (1 + 0.012 * Math.sin(t * 1.2 + n.ph)), q)
        const y = mix(n.cy + Math.cos(t * n.sp * 1.9 + n.ph) * j, n.oy * (1 + 0.012 * Math.sin(t * 1.2 + n.ph)), q)
        return [X + x * S, Y + y * S]
      })
      const core = [X, Y]

      // tangled links fade out
      if (q < 1) {
        ctx.lineWidth = 1
        CHAOS_LINKS.forEach(([a, b], i) => {
          const flick = 0.5 + 0.5 * Math.sin(t * 7 + i)
          ctx.strokeStyle = col(i % 3 ? AMBER : RED, (1 - q) * (0.12 + 0.18 * flick))
          ctx.beginPath(); ctx.moveTo(...pos[a]); ctx.lineTo(...pos[b]); ctx.stroke()
        })
      }
      // ordered links fade in, with light travelling along them
      if (q > 0) {
        ORDER_LINKS.forEach(([a, b], i) => {
          const A = a < 0 ? core : pos[a], B = pos[b]
          ctx.strokeStyle = col(a < HUBS ? SOFT : ROSE, q * (a < HUBS ? 0.55 : 0.32))
          ctx.lineWidth = a >= 0 && a < HUBS ? 1.2 : 1
          ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke()
          if (q > 0.85) {
            const f = (t * 0.45 + i * 0.173) % 1
            ctx.fillStyle = col(WHITE, (q - 0.85) * 5 * 0.8)
            ctx.beginPath(); ctx.arc(mix(A[0], B[0], f), mix(A[1], B[1], f), 1.3, 0, 7); ctx.fill()
          }
        })
        // core
        const pulse = 0.85 + 0.15 * Math.sin(t * 1.8)
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, S * 0.34)
        g.addColorStop(0, col([255, 210, 225], q * pulse))
        g.addColorStop(0.25, col(ROSE, q * 0.7 * pulse))
        g.addColorStop(1, col(ROSE, 0))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, S * 0.34, 0, 7); ctx.fill()
      }
      // nodes: warm and flickering in chaos, rose and steady in order
      pos.forEach(([x, y], i) => {
        const n = NODES[i]
        const hub = i < HUBS
        const chaosC = n.warm ? AMBER : RED
        const c = blend(chaosC, hub ? WHITE : SOFT, q)
        const flick = (1 - q) * (0.5 + 0.5 * Math.sin(t * 9 * n.sp + n.ph))
        const a = 0.55 + 0.45 * (q + (1 - q) * flick)
        const r = hub ? mix(2.2, 4.5, q) : mix(1.8, 2.2, q)
        if (hub && q > 0.3) {
          const h = ctx.createRadialGradient(x, y, 0, x, y, 18)
          h.addColorStop(0, col(ROSE, 0.6 * q)); h.addColorStop(1, col(ROSE, 0))
          ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill()
        }
        ctx.fillStyle = col(c, a)
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill()
      })
      // place the principle labels next to their hubs
      if (hubsRef && hubsRef.current) {
        hubsRef.current.forEach((lab, i) => {
          if (!lab) return
          const [x, y] = pos[i]
          lab.style.transform = `translate(${x}px, ${y}px)`
          lab.style.opacity = Math.max(0, Math.min(1, (q - 0.55 - i * 0.08) / 0.15))
        })
      }
    }

    const resize = () => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr)
      draw()
    }
    const loop = () => { draw(); raf = visible ? requestAnimationFrame(loop) : 0 }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop) })
    const ro = new ResizeObserver(resize)
    ro.observe(el); io.observe(el)
    return () => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf) }
  }, [hubsRef])

  return <canvas ref={canvas} className="absolute inset-0 w-full h-full" aria-hidden="true" />
}

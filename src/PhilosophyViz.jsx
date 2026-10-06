// The three Datatrop philosophy visuals, drawn on canvas with additive glow:
//   decipher → a tangle of signals (from noise)
//   derive   → a core with ordered orbits (to clarity)
//   datatrop → a wireframe system with a lit core (to a working system)
// Animates only while on screen; reduced-motion visitors get a still frame.
import { useEffect, useRef } from 'react'

const ROSE = [224, 69, 123]
const SOFT = [240, 141, 176]
const GRAPE = [176, 72, 186]
const WHITE = [255, 236, 246]
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`

// Small deterministic random so the tangle looks the same on every load
function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

const TANGLE = (() => {
  const rand = rng(7)
  return Array.from({ length: 64 }, () => {
    const n = 6 + Math.floor(rand() * 4)
    return {
      pts: Array.from({ length: n }, () => ({ a: rand() * Math.PI * 2, r: 0.25 + rand() * 0.75, ph: rand() * 6.28 })),
      col: rand() < 0.45 ? WHITE : rand() < 0.6 ? SOFT : GRAPE,
      alpha: 0.18 + rand() * 0.32,
      w: 0.6 + rand() * 0.8,
    }
  })
})()

function drawDecipher(ctx, w, h, t) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2)
  glow.addColorStop(0, rgba(ROSE, 0.16))
  glow.addColorStop(1, rgba(ROSE, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  for (const s of TANGLE) {
    const p = s.pts.map(({ a, r, ph }) => {
      const rr = R * r * (1 + 0.06 * Math.sin(t * 0.7 + ph))
      const aa = a + 0.12 * Math.sin(t * 0.35 + ph * 1.7)
      return [cx + Math.cos(aa) * rr * 1.25, cy + Math.sin(aa) * rr]
    })
    ctx.beginPath()
    const mid = (i) => [(p[i][0] + p[(i + 1) % p.length][0]) / 2, (p[i][1] + p[(i + 1) % p.length][1]) / 2]
    const m0 = mid(p.length - 1)
    ctx.moveTo(m0[0], m0[1])
    for (let i = 0; i < p.length; i++) {
      const m = mid(i)
      ctx.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1])
    }
    ctx.strokeStyle = rgba(s.col, s.alpha)
    ctx.lineWidth = s.w
    ctx.stroke()
  }
  // Loose sparks
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39 + t * 0.15, r = R * (0.35 + ((i * 37) % 60) / 100)
    const x = cx + Math.cos(a) * r * 1.25, y = cy + Math.sin(a) * r
    ctx.fillStyle = rgba(i % 3 ? SOFT : WHITE, 0.55 + 0.4 * Math.sin(t * 2 + i))
    ctx.beginPath(); ctx.arc(x, y, 1.1, 0, 7); ctx.fill()
  }
}

const ORBITS = [
  { tilt: 0, speed: 0.55, phase: 0, size: 0.07 },
  { tilt: Math.PI / 3, speed: -0.42, phase: 2, size: 0.055 },
  { tilt: -Math.PI / 3, speed: 0.35, phase: 4, size: 0.065 },
]

function drawDerive(ctx, w, h, t) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44
  const rx = R * 0.98, ry = R * 0.3
  const moons = ORBITS.map((o) => {
    const a = o.phase + t * o.speed
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry
    const c = Math.cos(o.tilt), s = Math.sin(o.tilt)
    return { x: cx + x * c - y * s, y: cy + x * s + y * c, front: Math.sin(a) > 0, size: R * o.size }
  })
  const moon = (m) => {
    const g = ctx.createRadialGradient(m.x - m.size * 0.35, m.y - m.size * 0.35, 0, m.x, m.y, m.size)
    g.addColorStop(0, rgba(WHITE, m.front ? 0.95 : 0.5))
    g.addColorStop(0.5, rgba(ROSE, m.front ? 0.9 : 0.45))
    g.addColorStop(1, rgba([90, 20, 60], 0.9))
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, 7); ctx.fill()
  }
  // Orbit paths
  for (const o of ORBITS) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.tilt)
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7)
    ctx.strokeStyle = rgba(SOFT, 0.42); ctx.lineWidth = 1; ctx.stroke()
    ctx.restore()
  }
  moons.filter((m) => !m.front).forEach(moon)
  // Core sphere
  const r = R * 0.3
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.4)
  halo.addColorStop(0, rgba(ROSE, 0.28)); halo.addColorStop(1, rgba(ROSE, 0))
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, 7); ctx.fill()
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r)
  g.addColorStop(0, rgba(WHITE, 0.95))
  g.addColorStop(0.35, rgba(SOFT, 0.95))
  g.addColorStop(0.75, rgba(ROSE, 0.9))
  g.addColorStop(1, rgba([70, 14, 48], 1))
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill()
  moons.filter((m) => m.front).forEach(moon)
}

// Cube corners and edges for the system visual
const CORNERS = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])))
const EDGES = []
CORNERS.forEach((a, i) => CORNERS.forEach((b, j) => {
  if (j > i && a.filter((v, k) => v !== b[k]).length === 1) EDGES.push([i, j])
}))

function drawDatatrop(ctx, w, h, t) {
  const cx = w / 2, cy = h / 2, S = Math.min(w, h) * 0.19
  const ry = 0.6 + t * 0.18, rx = -0.5
  const project = ([x, y, z], k) => {
    const x1 = x * Math.cos(ry) + z * Math.sin(ry)
    const z1 = -x * Math.sin(ry) + z * Math.cos(ry)
    const y1 = y * Math.cos(rx) - z1 * Math.sin(rx)
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx)
    const p = 6 / (6 + z2 * k)
    return [cx + x1 * S * k * p, cy + y1 * S * k * p]
  }
  const outer = CORNERS.map((c) => project(c, 1.25))
  const inner = CORNERS.map((c) => project(c, 0.45))
  // Core glow
  const pulse = 0.85 + 0.15 * Math.sin(t * 1.6)
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.3)
  core.addColorStop(0, rgba([255, 190, 170], 0.95 * pulse))
  core.addColorStop(0.18, rgba(ROSE, 0.75 * pulse))
  core.addColorStop(0.55, rgba(GRAPE, 0.18))
  core.addColorStop(1, rgba(GRAPE, 0))
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, S * 1.3, 0, 7); ctx.fill()
  // Spokes from outer to inner corners
  ctx.lineWidth = 0.8
  CORNERS.forEach((_, i) => {
    ctx.strokeStyle = rgba(SOFT, 0.3)
    ctx.beginPath(); ctx.moveTo(...outer[i]); ctx.lineTo(...inner[i]); ctx.stroke()
  })
  // Lattice: thirds across each outer edge pair
  ctx.strokeStyle = rgba(GRAPE, 0.35)
  EDGES.forEach(([a, b]) => {
    for (const f of [1 / 3, 2 / 3]) {
      const p = [outer[a][0] + (outer[b][0] - outer[a][0]) * f, outer[a][1] + (outer[b][1] - outer[a][1]) * f]
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.4, 0, 7); ctx.fillStyle = rgba(SOFT, 0.7); ctx.fill()
    }
  })
  // Edges
  const edges = (pts, col, wdt) => {
    ctx.strokeStyle = col; ctx.lineWidth = wdt
    EDGES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); ctx.stroke() })
  }
  edges(outer, rgba(SOFT, 0.75), 1.1)
  edges(inner, rgba([255, 200, 190], 0.95), 1.4)
  // Light travelling along the outer edges
  EDGES.forEach(([a, b], i) => {
    const f = (t * 0.35 + i * 0.137) % 1
    const x = outer[a][0] + (outer[b][0] - outer[a][0]) * f, y = outer[a][1] + (outer[b][1] - outer[a][1]) * f
    ctx.fillStyle = rgba(WHITE, 0.9); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 7); ctx.fill()
  })
  outer.forEach((p) => { ctx.fillStyle = rgba(WHITE, 0.9); ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, 7); ctx.fill() })
}

const DRAW = { decipher: drawDecipher, derive: drawDerive, datatrop: drawDatatrop }

export default function PhilosophyViz({ kind, className = '' }) {
  const canvas = useRef(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    const draw = DRAW[kind]
    let w = 0, h = 0, raf = 0, visible = false
    const start = performance.now()
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const paint = (t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      const dpr = el.width / w
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'lighter'
      draw(ctx, w, h, t)
    }
    const resize = () => {
      const r = el.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width; h = r.height
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr)
      paint(still ? 4 : (performance.now() - start) / 1000)
    }
    const loop = () => {
      paint((performance.now() - start) / 1000)
      raf = visible ? requestAnimationFrame(loop) : 0
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !still && !raf) raf = requestAnimationFrame(loop)
    })
    const ro = new ResizeObserver(resize)
    ro.observe(el); io.observe(el)
    return () => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf) }
  }, [kind])

  return <canvas ref={canvas} className={`block w-full h-full ${className}`} aria-hidden="true" />
}

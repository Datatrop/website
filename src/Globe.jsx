// Hero globe: the Earth at night (NASA Black Marble 2016, public domain),
// telling the brand story in a few seconds. The world starts out noisy: city
// lights flicker in warning amber and broken lines scrawl between cities.
// Then order spreads out from the visitor's own region (guessed from their
// time zone; nothing is asked or stored): clean pink routes join the cities
// and light starts to flow along them. After that the globe turns from city
// to city, showing a problem we solve (Admin → Problems) being solved, marked
// with the Datatrop symbol.
// The planet is a WebGL fragment shader (ray-cast sphere + rim light); the
// routes, pins and symbol go on a 2D canvas in front, and the text is HTML so
// it stays crisp. Animates only while on screen and once the intro video has
// finished; reduced-motion visitors get the finished globe as a still frame,
// and browsers without WebGL get the static photo.
import { useEffect, useRef, useState } from 'react'
import earthNight from './assets/home/earth-night.jpg'
import earthPhoto from './assets/home/hero-earth.jpg'
import { MARK } from './logoData'
import { LogoMarkArrows } from './Logo.jsx'

const RAD = Math.PI / 180
const TAU = Math.PI * 2
const TILT = 0.38 // radians, shows a little more of the northern hemisphere
const SPIN = TAU / 90 // one turn every 90s
const START = -1.1 // without a visitor location: Africa / India facing the viewer

// Story timing, in seconds
const ORDER_START = 1.3 // the noisy world settles into a network…
const ORDER_LEN = 2.1
const ORDER_END = ORDER_START + ORDER_LEN
const TOUR_START = ORDER_END + 0.9 // …then the tour of problems begins
// Each stop of the tour, timed from when the globe stops turning
const SHOW = 0.1, SOLVE = 2.4, HIDE = 5.4, NEXT = 6.0
const FOCUS_X = 0.22 // the city sits left of centre, leaving room for its card

// Shown until Admin → Problems loads (and in the static preview)
const FALLBACK_PROBLEMS = [
  { id: 'f1', title: 'Fragmented Operations', symptoms: 'Excel everywhere, data duplication, manual handoffs, no visibility.', solution: 'Unified Business Operating Systems' },
  { id: 'f2', title: 'Revenue Leakage', symptoms: 'Missed leads, poor follow-up, lost opportunities, low conversion.', solution: 'Revenue Intelligence Systems' },
  { id: 'f3', title: 'Communication Chaos', symptoms: 'Calls on personal phones, no visibility, lost customers, no accountability.', solution: 'Communication Operating Systems' },
  { id: 'f4', title: 'Lack of Organizational Intelligence', symptoms: 'Knowledge trapped in employees, decisions depend on individuals, no institutional memory.', solution: 'Enterprise Knowledge & Memory Systems' },
  { id: 'f5', title: 'High Human Dependency', symptoms: 'Repetitive work, hiring challenges, process bottlenecks.', solution: 'AI Workforce Systems' },
]

// Cities that make up the network: [lat, lon]
const CITIES = {
  london: [51.5, -0.1], frankfurt: [50.1, 8.7], moscow: [55.8, 37.6], istanbul: [41.0, 29.0],
  cairo: [30.0, 31.2], lagos: [6.5, 3.4], nairobi: [-1.3, 36.8], johannesburg: [-26.2, 28.0],
  dubai: [25.2, 55.3], mumbai: [19.1, 72.9], delhi: [28.6, 77.2], kochi: [10.0, 76.3],
  singapore: [1.35, 103.8], hongkong: [22.3, 114.2], shanghai: [31.2, 121.5], seoul: [37.6, 127.0],
  tokyo: [35.7, 139.7], sydney: [-33.9, 151.2], losangeles: [34.05, -118.2], chicago: [41.9, -87.6],
  newyork: [40.7, -74.0], mexicocity: [19.4, -99.1], bogota: [4.7, -74.1], saopaulo: [-23.5, -46.6],
  buenosaires: [-34.6, -58.4],
}
const LONG_HAUL = [
  ['london', 'newyork'], ['tokyo', 'losangeles'], ['singapore', 'sydney'], ['saopaulo', 'lagos'],
  ['dubai', 'johannesburg'], ['mumbai', 'singapore'], ['frankfurt', 'dubai'], ['bogota', 'mexicocity'],
]
// Where each problem is shown, in this order (bright cities, spread around the world)
const STAGES = ['mumbai', 'london', 'newyork', 'tokyo', 'saopaulo', 'dubai', 'singapore', 'sydney']

const unit = ([lat, lon]) => [Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD), Math.cos(lat * RAD) * Math.cos(lon * RAD)]
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
const KEYS = Object.keys(CITIES)
const UNIT = Object.fromEntries(KEYS.map((k) => [k, unit(CITIES[k])]))
const pairId = (a, b) => [a, b].sort().join('|')

// The ordered network: each city to its two nearest neighbours, plus long hauls
const LINKS = (() => {
  const seen = new Set(), out = []
  const add = (a, b) => { const id = pairId(a, b); if (a !== b && !seen.has(id)) { seen.add(id); out.push([a, b]) } }
  KEYS.forEach((a) => {
    KEYS.filter((b) => b !== a).sort((b, c) => angle(UNIT[a], UNIT[b]) - angle(UNIT[a], UNIT[c])).slice(0, 2).forEach((b) => add(a, b))
  })
  LONG_HAUL.forEach(([a, b]) => add(a, b))
  return out
})()

// The noise: crossed lines between cities that the ordered network doesn't join
const CHAOS = (() => {
  let s = 11
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const linked = new Set(LINKS.map(([a, b]) => pairId(a, b)))
  const out = []
  KEYS.forEach((a) => {
    const near = KEYS.filter((b) => b !== a && angle(UNIT[a], UNIT[b]) < 1.5 && !linked.has(pairId(a, b)))
    for (let i = 0; i < 3 && near.length; i++) out.push([a, near.splice(Math.floor(rnd() * near.length), 1)[0]])
  })
  return out
})()

// A great-circle route lifted off the surface, as flat [x, y, z, x, y, z, …]
function arcPoints(A, B, w) {
  const n = Math.max(8, Math.min(40, Math.round(w * 30)))
  const s = Math.sin(w) || 1, lift = Math.min(0.06, 0.015 + w * 0.05)
  const out = new Float32Array((n + 1) * 3)
  for (let i = 0; i <= n; i++) {
    const t = i / n, ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s, h = 1 + lift * Math.sin(Math.PI * t)
    for (let c = 0; c < 3; c++) out[i * 3 + c] = (A[c] * ka + B[c] * kb) * h
  }
  return out
}

// The visitor's rough location from their time zone (no permission needed)
const ZONES = {
  'Asia/Kolkata': [17.4, 78.5], 'Asia/Calcutta': [17.4, 78.5], 'Asia/Dubai': [25.2, 55.3], 'Asia/Muscat': [23.6, 58.4],
  'Asia/Qatar': [25.3, 51.5], 'Asia/Riyadh': [24.7, 46.7], 'Asia/Kuwait': [29.4, 48.0], 'Asia/Bahrain': [26.2, 50.6],
  'Asia/Karachi': [24.9, 67.0], 'Asia/Dhaka': [23.8, 90.4], 'Asia/Colombo': [6.9, 79.9], 'Asia/Kathmandu': [27.7, 85.3],
  'Asia/Singapore': [1.35, 103.8], 'Asia/Kuala_Lumpur': [3.1, 101.7], 'Asia/Jakarta': [-6.2, 106.8], 'Asia/Bangkok': [13.8, 100.5],
  'Asia/Manila': [14.6, 121.0], 'Asia/Hong_Kong': [22.3, 114.2], 'Asia/Shanghai': [31.2, 121.5], 'Asia/Tokyo': [35.7, 139.7],
  'Asia/Seoul': [37.6, 127.0], 'Asia/Jerusalem': [31.8, 35.2], 'Europe/London': [51.5, -0.1], 'Europe/Dublin': [53.3, -6.3],
  'Europe/Amsterdam': [52.4, 4.9], 'Europe/Brussels': [50.8, 4.4], 'Europe/Paris': [48.9, 2.35], 'Europe/Berlin': [52.5, 13.4],
  'Europe/Madrid': [40.4, -3.7], 'Europe/Rome': [41.9, 12.5], 'Europe/Zurich': [47.4, 8.5], 'Europe/Stockholm': [59.3, 18.1],
  'Europe/Istanbul': [41.0, 29.0], 'Europe/Moscow': [55.8, 37.6], 'Africa/Cairo': [30.0, 31.2], 'Africa/Lagos': [6.5, 3.4],
  'Africa/Nairobi': [-1.3, 36.8], 'Africa/Johannesburg': [-26.2, 28.0], 'America/New_York': [40.7, -74.0],
  'America/Toronto': [43.7, -79.4], 'America/Chicago': [41.9, -87.6], 'America/Denver': [39.7, -105.0],
  'America/Los_Angeles': [34.05, -118.2], 'America/Mexico_City': [19.4, -99.1], 'America/Bogota': [4.7, -74.1],
  'America/Sao_Paulo': [-23.5, -46.6], 'America/Argentina/Buenos_Aires': [-34.6, -58.4], 'Australia/Sydney': [-33.9, 151.2],
  'Australia/Melbourne': [-37.8, 145.0], 'Pacific/Auckland': [-36.8, 174.8],
}
const REGION_LAT = { Europe: 50, Africa: 5, Asia: 28, America: 30, Australia: -30, Pacific: -15, Indian: -10, Atlantic: 35 }
function visitorPlace() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (ZONES[tz]) return ZONES[tz]
    const region = tz.split('/')[0]
    if (!(region in REGION_LAT)) return null // UTC and friends say nothing about where someone is
    return [REGION_LAT[region], Math.max(-180, Math.min(180, -new Date().getTimezoneOffset() / 4))]
  } catch {
    return null
  }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)
const hash = (n) => { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x) }
const clampTilt = (v) => Math.max(-0.5, Math.min(0.72, v))
// "Revenue Intelligence Systems — lead scoring, …" → "Revenue Intelligence Systems"
const shortSolution = (s = '') => {
  const head = s.split(/\s+[—–-]\s+/)[0].trim()
  return head.length > 90 ? `${head.slice(0, 88).trimEnd()}…` : head
}

// The eight arrows of the Datatrop symbol, clockwise from the top
const ARROWS = MARK.colors.map((c, k) => {
  const a = (-90 + k * 45) * RAD
  return { ux: Math.cos(a), uy: Math.sin(a), long: k % 4 === 2, c }
})

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`
const FRAG = `precision highp float;
uniform sampler2D tex; uniform vec2 center; uniform float radius; uniform float spin; uniform float tilt;
uniform float order; uniform float time;
const float PI = 3.14159265;
void main(){
  vec2 p = (gl_FragCoord.xy - center) / radius;
  float d = length(p);
  vec4 outCol = vec4(0.);
  // soft atmosphere outside the disc
  float glow = exp(-(d - 1.) * 12.) * 0.35 * step(1., d);
  outCol = vec4(vec3(0.62, 0.36, 0.98) * glow, glow);
  if (d < 1.0 + 2.0 / radius) {
    float zt = sqrt(max(0., 1. - d * d));
    float y = p.y * cos(tilt) + zt * sin(tilt);
    float z = -p.y * sin(tilt) + zt * cos(tilt);
    float lat = asin(clamp(y, -1., 1.));
    float lon = atan(p.x, z) - spin;
    vec2 uv = vec2(fract(lon / (2. * PI) + 0.5), 0.5 - lat / PI);
    float L = texture2D(tex, uv).r;
    float lights = smoothstep(0.12, 0.6, L);
    float land = smoothstep(0.03, 0.16, L);
    vec3 base = mix(vec3(0.012, 0.006, 0.02), vec3(0.06, 0.03, 0.08), land);
    vec3 pink = mix(vec3(0.90, 0.28, 0.50), vec3(1.0, 0.86, 0.93), lights * lights);
    // until order arrives, the lights flicker in warning amber, patch by patch
    float h = fract(sin(dot(floor(uv * vec2(360., 180.)), vec2(12.9898, 78.233))) * 43758.5453);
    float flick = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(time * (3. + h * 9.) + h * 40.), 3.);
    vec3 amber = mix(vec3(0.95, 0.38, 0.14), vec3(1.0, 0.78, 0.40), lights * lights) * flick;
    vec3 col = base + mix(amber, pink, order) * lights * 1.9;
    vec3 n = vec3(p.x, p.y, zt);
    float diff = clamp(dot(n, normalize(vec3(0.55, 0.45, 0.7))), 0., 1.);
    col *= 0.55 + 0.6 * diff;
    float rim = pow(1. - zt, 3.0);
    col += vec3(0.55, 0.36, 0.98) * rim * (0.2 + 0.7 * diff);
    float edge = clamp((1. - d) * radius, 0., 1.);
    outCol = vec4(col, 1.) * edge + outCol * (1. - edge);
  }
  gl_FragColor = outCol;
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
}

/**
 * cx, cy: globe centre as a fraction of the box; size: radius as a fraction
 * of the box's smaller side (capped by `maxWidth` × box width).
 */
export default function Globe({ cx = 0.5, cy = 0.5, size = 0.36, maxWidth = 1, problems = [], className = '' }) {
  const box = useRef(null)
  const glCanvas = useRef(null)
  const front = useRef(null)
  const cardEl = useRef(null)
  const youEl = useRef(null)
  const [fallback, setFallback] = useState(false)
  const [card, setCard] = useState({ i: 0, show: false, solved: false })
  const list = problems.length ? problems : FALLBACK_PROBLEMS
  const listRef = useRef(list)
  useEffect(() => { listRef.current = list }, [list])

  useEffect(() => {
    const el = box.current, cv = glCanvas.current
    if (!el || !cv) return
    const gl = cv.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true })
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!gl || !vs || !fs) { setFallback(true); return }
    const prog = gl.createProgram()
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n) => gl.getUniformLocation(prog, n)
    const uCenter = U('center'), uRadius = U('radius'), uSpin = U('spin'), uTilt = U('tilt'), uOrder = U('order'), uTime = U('time')

    let ready = false
    const tex = gl.createTexture()
    const img = new Image()
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      ready = true
      if (!gone) draw(time())
    }
    img.onerror = () => { gone = true; setFallback(true) }
    img.src = earthNight

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const time = () => (still ? 0 : (performance.now() - t0) / 1000)
    const introOn = () => document.documentElement.classList.contains('intro-playing')
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false

    // Play the noisy opening once per visit; after that the globe starts in order
    let seen = false
    try { seen = sessionStorage.getItem('datatrop_globe_story') === '1' } catch { /* storage blocked */ }
    let story = still ? 1e3 : seen ? ORDER_END : 0

    // Routes: the visitor joins the two nearest cities first, then order
    // spreads outwards from them across the rest of the network
    const you = visitorPlace()
    const youU = you && unit(you)
    const origin = youU || unit([TILT / RAD, -START / RAD])
    const routes = [
      ...(youU
        ? KEYS.filter((k) => angle(youU, UNIT[k]) > 0.03).sort((a, b) => angle(youU, UNIT[a]) - angle(youU, UNIT[b])).slice(0, 2).map((k) => [youU, UNIT[k], true])
        : []),
      ...LINKS.map(([a, b]) => [UNIT[a], UNIT[b], false]),
    ].map(([A, B, mine], i) => {
      const w = angle(A, B), pts = arcPoints(A, B, w), n = pts.length / 3 - 1
      return {
        pts, n, w, mine, phase: hash(i * 1.37),
        delay: mine ? 0 : Math.min(1.2, (Math.min(angle(origin, A), angle(origin, B)) / Math.PI) * 1.9),
        sx: new Float32Array(n + 1), sy: new Float32Array(n + 1), on: new Uint8Array(n + 1),
      }
    })

    // Rotation: the globe faces the visitor first, turns on its own, can be
    // dragged to spin (left/right) or tip (up/down), and a flick keeps it
    // spinning for a moment. During the tour it turns city to city.
    let spin = you ? -you[1] * RAD : START
    let tiltRest = you ? clampTilt(you[0] * RAD) : TILT
    let tilt = tiltRest, vel = 0, last = performance.now()
    let drag = null, userAt = -1e9
    const tour = { stop: null, order: [], k: -1, n: 0, u: 0, move: 1, from: 0, to: 0, tFrom: 0, tTo: 0, replan: true }
    let shown = { i: 0, show: false, solved: false }

    // Start with the city nearest the middle of the view, then head west, the way the Earth turns
    const plan = (n) => {
      const c = -spin / RAD
      const west = (from, lon) => (((from - lon) % 360) + 360) % 360
      const away = (lon) => Math.min(west(c, lon), 360 - west(c, lon))
      const stops = STAGES.slice(0, n).map((k, i) => ({ k, i, lon: CITIES[k][1] }))
      const first = stops.reduce((a, b) => (away(b.lon) < away(a.lon) ? b : a))
      tour.order = stops.sort((a, b) => west(first.lon, a.lon) - west(first.lon, b.lon))
      tour.k = -1; tour.n = n; tour.replan = false
    }
    const nextStop = () => {
      const n = Math.max(1, Math.min(STAGES.length, listRef.current.length))
      if (tour.replan || n !== tour.n) plan(n)
      tour.k = (tour.k + 1) % tour.order.length
      const stop = tour.order[tour.k], [lat, lon] = CITIES[stop.k]
      let d = -(lon * RAD + FOCUS_X) - spin
      d = (((d + 0.6) % TAU) + TAU) % TAU - 0.6 // turn the way the Earth turns, unless it's only just behind
      Object.assign(tour, { stop, u: 0, from: spin, to: spin + d, tFrom: tilt, tTo: clampTilt(lat * RAD), move: still ? 0 : 1.1 + Math.abs(d) * 0.4 })
      tiltRest = tour.tTo
    }

    const geom = () => ({ R: Math.min(Math.min(W, H) * size, W * maxWidth), X: W * cx, Y: H * cy })
    const onGlobe = (e) => {
      const r = el.getBoundingClientRect(), { R, X, Y } = geom()
      return Math.hypot(e.clientX - r.left - X, e.clientY - r.top - Y) <= R * 1.08
    }
    const step = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (introOn()) return // the site is hidden under the intro video
      if (!still) story += dt
      if (!seen && story >= ORDER_END) {
        seen = true
        try { sessionStorage.setItem('datatrop_globe_story', '1') } catch { /* storage blocked */ }
      }
      if (drag) { userAt = now; return }
      const coasting = now - userAt < 2500
      if (coasting || story < TOUR_START) {
        if (coasting) { tour.stop = null; tour.replan = true } // the tour picks up from wherever it's left
        spin += (still ? 0 : SPIN * dt) + vel * dt
        vel *= Math.pow(0.04, dt) // a flick fades out within about a second
        tilt += (tiltRest - tilt) * Math.min(1, dt * 1.5)
        return
      }
      if (still) {
        if (!tour.stop) { nextStop(); spin = tour.to; tilt = tour.tTo; tour.u = SOLVE + 1 } // the first problem, already solved
        return
      }
      if (!tour.stop || tour.u >= tour.move + NEXT) nextStop()
      tour.u += dt
      if (tour.u <= tour.move) {
        const m = ease(tour.u / tour.move)
        spin = tour.from + (tour.to - tour.from) * m
        tilt = tour.tFrom + (tour.tTo - tour.tFrom) * m
      } else spin += SPIN * 0.1 * dt
    }
    const onDown = (e) => {
      if (!onGlobe(e)) return
      e.preventDefault() // no text selection while dragging
      drag = { x: e.clientX, y: e.clientY, spin, tilt, lastX: e.clientX, lastT: performance.now() }
      vel = 0
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onMove = (e) => {
      if (!drag) { el.style.cursor = onGlobe(e) ? 'grab' : ''; return }
      const { R } = geom()
      spin = drag.spin + (e.clientX - drag.x) / R
      tilt = Math.max(-0.9, Math.min(1.1, drag.tilt + (e.clientY - drag.y) / R))
      const now = performance.now()
      if (now > drag.lastT) vel = (e.clientX - drag.lastX) / R / ((now - drag.lastT) / 1000)
      drag.lastX = e.clientX; drag.lastT = now
    }
    const onUp = () => {
      if (!drag) return
      drag = null
      vel = Math.max(-6, Math.min(6, vel))
      el.style.cursor = 'grab'
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    const fctx = front.current.getContext('2d')

    let gone = false // set once we switch to the still photo or unmount
    const resize = () => {
      if (gone || !front.current) return
      const r = el.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      for (const c of [cv, front.current]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
      gl.viewport(0, 0, cv.width, cv.height)
      draw(time())
    }

    const strokeRoute = (r, upto, width, color) => {
      fctx.lineWidth = width; fctx.strokeStyle = color; fctx.beginPath()
      let pen = false
      for (let s = 0; s <= upto; s++) {
        if (!r.on[s]) { pen = false; continue }
        if (pen) fctx.lineTo(r.sx[s], r.sy[s])
        else { fctx.moveTo(r.sx[s], r.sy[s]); pen = true }
      }
      fctx.stroke()
    }
    const dot = (x, y, r, color) => { fctx.fillStyle = color; fctx.beginPath(); fctx.arc(x, y, r, 0, TAU); fctx.fill() }
    const ring = (x, y, r, width, color) => { fctx.lineWidth = width; fctx.strokeStyle = color; fctx.beginPath(); fctx.arc(x, y, r, 0, TAU); fctx.stroke() }
    // The Datatrop symbol, drawn at radius r
    const drawMark = (x, y, r, alpha) => {
      if (r <= 0.5 || alpha <= 0) return
      fctx.save()
      fctx.globalAlpha = alpha; fctx.lineCap = 'round'; fctx.lineJoin = 'round'
      for (const { ux, uy, long, c } of ARROWS) {
        const L = r * (long ? 1.07 : 1), px = -uy, py = ux, base = L - r * 0.24, hw = r * 0.12
        fctx.strokeStyle = c; fctx.fillStyle = c; fctx.lineWidth = Math.max(1.2, r * 0.075)
        fctx.beginPath(); fctx.moveTo(x + ux * r * 0.12, y + uy * r * 0.12); fctx.lineTo(x + ux * (L - r * 0.2), y + uy * (L - r * 0.2)); fctx.stroke()
        fctx.beginPath(); fctx.moveTo(x + ux * L, y + uy * L)
        fctx.lineTo(x + ux * base + px * hw, y + uy * base + py * hw); fctx.lineTo(x + ux * base - px * hw, y + uy * base - py * hw)
        fctx.closePath(); fctx.fill()
      }
      dot(x, y, r * 0.13, 'rgba(236,95,164,0.5)')
      dot(x, y, r * 0.07, '#FF8FC8')
      fctx.restore()
    }

    const draw = (t) => {
      const R = Math.min(Math.min(W, H) * size, W * maxWidth)
      const X = W * cx, Y = H * cy
      const order = ease(clamp01((story - ORDER_START) / ORDER_LEN))
      // globe
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      if (ready) {
        gl.uniform2f(uCenter, X * dpr, (H - Y) * dpr)
        gl.uniform1f(uRadius, R * dpr)
        gl.uniform1f(uSpin, spin)
        gl.uniform1f(uTilt, tilt)
        gl.uniform1f(uOrder, order)
        gl.uniform1f(uTime, t)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H)
      const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt)
      // point on the globe → [screen x, screen y, depth toward the viewer]
      const P = (u) => {
        const x1 = u[0] * cs + u[2] * sn, z1 = -u[0] * sn + u[2] * cs
        return [X + x1 * R, Y - (u[1] * ct - z1 * st) * R, u[1] * st + z1 * ct]
      }

      // 1. noise: broken, jittering lines that fade as order arrives
      if (order < 1) {
        const b = Math.floor(t * 12)
        fctx.setLineDash([3, 5]); fctx.lineWidth = 1.2
        CHAOS.forEach(([ka, kb], i) => {
          const pa = P(UNIT[ka]), pb = P(UNIT[kb])
          if (pa[2] < 0.08 || pb[2] < 0.08) return
          const a = (1 - order) * (0.3 + 0.7 * hash(i * 7.1 + b))
          fctx.strokeStyle = i % 3 ? `rgba(246,196,83,${0.75 * a})` : `rgba(232,90,70,${0.8 * a})`
          const dx = pb[0] - pa[0], dy = pb[1] - pa[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len
          fctx.beginPath(); fctx.moveTo(pa[0], pa[1])
          for (let s = 1; s < 6; s++) {
            const j = (hash(i * 13.7 + s * 3.1 + b) - 0.5) * Math.min(26, len * 0.2)
            fctx.lineTo(pa[0] + (dx * s) / 6 + nx * j, pa[1] + (dy * s) / 6 + ny * j)
          }
          fctx.lineTo(pb[0], pb[1]); fctx.stroke()
        })
        fctx.setLineDash([])
      }

      // 2. order: clean routes draw in, spreading out from the visitor
      if (order > 0) {
        for (const r of routes) {
          const g = clamp01((story - ORDER_START - r.delay) / 0.8)
          if (g <= 0) continue
          const p = r.pts
          for (let s = 0; s <= r.n; s++) {
            const x = p[s * 3], y = p[s * 3 + 1], z = p[s * 3 + 2]
            const x1 = x * cs + z * sn, z1 = -x * sn + z * cs, sy = y * ct - z1 * st
            r.sx[s] = X + x1 * R; r.sy[s] = Y - sy * R
            r.on[s] = y * st + z1 * ct > 0.02 && x1 * x1 + sy * sy < 0.995 ? 1 : 0 // on the face of the planet only
          }
          const upto = Math.max(1, Math.round(g * r.n)), a = Math.min(1, g * 2)
          strokeRoute(r, upto, r.mine ? 3.5 : 3, `rgba(224,69,123,${0.1 * a})`)
          strokeRoute(r, upto, r.mine ? 1.4 : 1, r.mine ? `rgba(255,236,246,${0.75 * a})` : `rgba(240,141,176,${0.5 * a})`)
        }
      }

      // 3. light flowing along the routes, at a steady rhythm
      const flow = still ? 0 : clamp01((story - ORDER_END) / 0.8)
      if (flow > 0) {
        for (const r of routes) {
          const f = ((t * 0.3) / Math.max(r.w, 0.45) + r.phase) % 1
          const s = Math.min(r.n - 1, Math.floor(f * r.n)), k = f * r.n - s
          if (!r.on[s] || !r.on[s + 1]) continue
          const x = r.sx[s] + (r.sx[s + 1] - r.sx[s]) * k, y = r.sy[s] + (r.sy[s + 1] - r.sy[s]) * k
          dot(x, y, 4.5, `rgba(224,69,123,${0.25 * flow})`)
          dot(x, y, 1.6, `rgba(255,236,246,${0.95 * flow})`)
        }
      }

      // 4. cities: flickering amber in the noise, steady pink once ordered
      const fb = Math.floor(t * 9)
      KEYS.forEach((key, i) => {
        const [x, y, z] = P(UNIT[key])
        if (z <= 0.02) return
        const fl = (1 - order) * (0.3 + 0.7 * hash(i * 3.7 + fb)) + order
        const c = `${Math.round(246 - 6 * order)},${Math.round(170 - 29 * order)},${Math.round(80 + 96 * order)}`
        dot(x, y, 1.8, `rgba(${c},${0.85 * fl * clamp01((z - 0.02) / 0.15)})`)
      })

      // 5. the visitor
      if (youU && youEl.current) {
        const [x, y, z] = P(youU)
        const vis = clamp01((z - 0.05) / 0.2) * clamp01(order * 2.5 - 0.3)
        youEl.current.style.opacity = vis
        if (vis > 0) {
          const k = (t * 0.55) % 1
          ring(x, y, 4 + k * 16, 1, `rgba(255,255,255,${0.55 * (1 - k) * vis})`)
          dot(x, y, 3.2, `rgba(255,255,255,${vis})`)
          youEl.current.style.transform = `translate(${Math.round(x + 9)}px, ${Math.round(y + 7)}px)`
        }
      }

      // 6. the tour: a problem glows amber, then resolves into the Datatrop symbol
      const rel = tour.stop ? tour.u - tour.move : -1
      const show = !!tour.stop && rel >= SHOW && rel < HIDE
      const solved = show && rel >= SOLVE
      const i = tour.stop ? tour.stop.i : shown.i
      if (show !== shown.show || solved !== shown.solved || i !== shown.i) { shown = { i, show, solved }; setCard(shown) }
      const cardBox = cardEl.current
      if (tour.stop) {
        const [x, y, z] = P(UNIT[tour.stop.k])
        const vis = clamp01((z - 0.1) / 0.2)
        if (vis > 0 && rel > -0.5) {
          if (rel < SOLVE) {
            const a = clamp01((rel + 0.5) / 0.5) * vis, k = (t * 1.4) % 1
            ring(x, y, 5 + k * 18, 1.5, `rgba(246,196,83,${0.75 * (1 - k) * a})`)
            dot(x, y, 4, `rgba(246,196,83,${a})`)
          } else {
            const k = rel - SOLVE, out = clamp01((rel - HIDE) / 0.5)
            if (k < 0.9) ring(x, y, 6 + (k / 0.9) * 40, 0.5 + 2 * (1 - k / 0.9), `rgba(240,141,176,${0.7 * (1 - k / 0.9) * vis})`)
            const r = Math.max(13, R * 0.1) * easeOutBack(clamp01(k / 0.6)) * (1 - 0.6 * out)
            const halo = fctx.createRadialGradient(x, y, 0, x, y, r * 1.9)
            halo.addColorStop(0, `rgba(224,69,123,${0.45 * vis * (1 - out)})`); halo.addColorStop(1, 'rgba(224,69,123,0)')
            dot(x, y, r * 1.9, halo)
            drawMark(x, y, r, vis * (1 - 0.7 * out))
          }
        }
        if (cardBox) {
          // the card sits above and to the right of its city, inside the box
          const inner = cardBox.firstChild, w = inner.offsetWidth, h = inner.offsetHeight
          const left = Math.min(Math.max(x + 16, 6), W - w - 6), top = Math.min(Math.max(y - 22 - h, 6), H - h - 6)
          cardBox.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
          cardBox.style.opacity = vis
          if (show && vis > 0) {
            const a = clamp01((rel - SHOW) / 0.3) * clamp01((HIDE - rel) / 0.3) * vis
            fctx.setLineDash([2, 3])
            fctx.lineWidth = 1; fctx.strokeStyle = solved ? `rgba(240,141,176,${0.7 * a})` : `rgba(246,196,83,${0.7 * a})`
            fctx.beginPath(); fctx.moveTo(x + 5, y - 5); fctx.lineTo(left + 14, top + h); fctx.stroke()
            fctx.setLineDash([])
          }
        }
      } else if (cardBox) cardBox.style.opacity = 0
    }

    const loop = () => { if (gone || !front.current) { raf = 0; return } step(); draw(time()); raf = visible && (!still || drag || Math.abs(vel) > 0.01) ? requestAnimationFrame(loop) : 0 }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
    })
    const ro = new ResizeObserver(resize)
    ro.observe(el); io.observe(el)
    return () => {
      gone = true
      ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [cx, cy, size, maxWidth])

  if (fallback) {
    return <img src={earthPhoto} alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full object-cover earth-img ${className}`} />
  }
  const item = list[card.i] || list[0] || {}
  return (
    // pan-y: on phones a sideways drag turns the globe and an up/down swipe still scrolls
    <div ref={box} className={`absolute inset-0 select-none [touch-action:pan-y] ${className}`} aria-hidden="true">
      <canvas ref={glCanvas} className="absolute inset-0 w-full h-full" />
      <canvas ref={front} className="absolute inset-0 w-full h-full" />
      <span ref={youEl} className="absolute left-0 top-0 pointer-events-none px-2 py-0.5 rounded-full border border-white/20 bg-[rgb(7_3_5/0.6)] text-white/85 text-[11px] leading-4 opacity-0">
        You
      </span>
      <div ref={cardEl} className="absolute left-0 top-0 pointer-events-none opacity-0">
        <div
          className={`w-[200px] sm:w-[250px] rounded-2xl border px-4 py-3.5 backdrop-blur-md shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] transition-[opacity,transform,border-color,background-color] duration-500 ${
            card.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${card.solved ? 'border-[rgb(var(--accent)_/_0.55)] bg-[rgb(27_5_13/0.8)]' : 'border-[rgba(246,196,83,0.45)] bg-[rgb(7_3_5/0.75)]'}`}
        >
          <div className="flex gap-2.5">
            <span className="relative mt-[3px] w-4 h-4 flex-shrink-0">
              <span className={`absolute inset-[4px] rounded-full bg-[#F6C453] shadow-[0_0_10px_rgba(246,196,83,0.8)] transition-opacity duration-300 ${card.solved ? 'opacity-0' : 'opacity-100'}`} />
              <svg viewBox={`${MARK.cx - 80} ${MARK.cy - 80} 160 160`} className={`absolute inset-0 w-full h-full transition-[opacity,transform] duration-500 ${card.solved ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                <LogoMarkArrows />
              </svg>
            </span>
            <div className="min-w-0">
              <p
                className="font-display text-[14px] sm:text-[15px] font-medium leading-snug"
                style={{
                  color: card.solved ? 'rgba(255,255,255,0.45)' : '#fff',
                  textDecorationLine: 'line-through',
                  textDecorationThickness: '1.5px',
                  textDecorationColor: card.solved ? 'rgb(224,69,123)' : 'transparent',
                  transition: 'color .5s, text-decoration-color .5s',
                }}
              >
                {item.title}
              </p>
              {item.symptoms && (
                <div className={`hidden sm:grid transition-[grid-template-rows,opacity,margin] duration-500 ${card.solved ? 'grid-rows-[0fr] opacity-0 mt-0' : 'grid-rows-[1fr] opacity-100 mt-1'}`}>
                  <p className="overflow-hidden text-[12.5px] leading-snug text-[#F6C453]/80 font-light">{item.symptoms}</p>
                </div>
              )}
              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ${card.solved ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <p className="overflow-hidden font-display text-[13px] sm:text-[14px] leading-snug text-white">{shortSolution(item.solution || item.description || '')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

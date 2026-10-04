// Home-hero particle scene, drawn with raw WebGL (no three.js: this keeps the
// homepage a few KB heavier instead of ~600KB). A few thousand glowing points
// drift as a nebula, gather into the Datatrop arrow mark, then re-form as a
// connected network, looping. The cursor pushes particles aside and tilts the
// scene. Pauses off-screen and in hidden tabs; reduced-motion users get a
// single still frame of the mark.
import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './hooks'

const PHASES = [
  { key: 'nebula', label: 'Scattered data, disconnected tools', hold: 1600 },
  { key: 'mark', label: 'Engineered into one system', hold: 5200 },
  { key: 'network', label: 'Running as a connected organization', hold: 4200 },
]
const MORPH_MS = 2400

// ── Shapes (unit space, roughly -1..1) ──────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const gauss = (r) => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) / 2 }

function nebula(n, r) {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const arm = i % 3
    const rad = Math.pow(r(), 0.7) * 1.35
    const a = arm * (Math.PI * 2 / 3) + rad * 2.4 + gauss(r) * 0.35
    out[i * 3] = Math.cos(a) * rad + gauss(r) * 0.06
    out[i * 3 + 1] = Math.sin(a) * rad * 0.62 + gauss(r) * 0.06
    out[i * 3 + 2] = gauss(r) * 0.28
  }
  return out
}

function mark(n, r) {
  // Eight arrows radiating from a bright centre, like the logo's "O"
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const k = i % 8
    const ang = (k * Math.PI) / 4 + Math.PI / 2
    const dx = Math.cos(ang); const dy = Math.sin(ang)
    const roll = r()
    let x; let y
    if (roll < 0.12) { // centre glow
      const rr = Math.abs(gauss(r)) * 0.07; const t = r() * Math.PI * 2
      x = Math.cos(t) * rr; y = Math.sin(t) * rr
    } else if (roll < 0.78) { // shaft
      const t = 0.1 + r() * 0.88
      x = dx * t; y = dy * t
    } else { // arrowhead: two barbs back from the tip
      const side = r() < 0.5 ? 1 : -1
      const t = r() * 0.2
      const ba = ang + Math.PI + side * 0.55
      x = dx * 0.98 + Math.cos(ba) * t; y = dy * 0.98 + Math.sin(ba) * t
    }
    out[i * 3] = x + gauss(r) * 0.012
    out[i * 3 + 1] = y + gauss(r) * 0.012
    out[i * 3 + 2] = gauss(r) * 0.04
  }
  return out
}

function network(n, r) {
  // Nodes on a sphere, joined to their nearest neighbours by arcs of particles
  const N = 22
  const nodes = []
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = i * 2.399963
    nodes.push([Math.cos(th) * rad * 0.95, y * 0.95, Math.sin(th) * rad * 0.95])
  }
  const edges = []
  nodes.forEach((a, i) => {
    nodes.map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
      .filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 3)
      .forEach(([j]) => { if (i < j) edges.push([i, j]) })
  })
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    let x; let y; let z
    if (r() < 0.32) {
      const nd = nodes[Math.floor(r() * N)]
      x = nd[0] + gauss(r) * 0.03; y = nd[1] + gauss(r) * 0.03; z = nd[2] + gauss(r) * 0.03
    } else {
      const [ia, ib] = edges[Math.floor(r() * edges.length)]
      const a = nodes[ia]; const b = nodes[ib]; const t = r()
      x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t; z = a[2] + (b[2] - a[2]) * t
      const l = Math.hypot(x, y, z) || 1
      const s = 0.95 / l // bow the edge out onto the sphere
      x *= s; y *= s; z *= s
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z
  }
  return out
}

// ── Tiny mat4 helpers (column-major) ────────────────────────────────────────
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2); const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}
function mul(a, b) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
    o[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3]
  }
  return o
}
const rotX = (t) => new Float32Array([1, 0, 0, 0, 0, Math.cos(t), Math.sin(t), 0, 0, -Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1])
const rotY = (t) => new Float32Array([Math.cos(t), 0, -Math.sin(t), 0, 0, 1, 0, 0, Math.sin(t), 0, Math.cos(t), 0, 0, 0, 0, 1])
const trans = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])

const VERT = `
attribute vec3 aFrom; attribute vec3 aTo; attribute float aSeed; attribute vec3 aColor;
uniform mat4 uProj; uniform mat4 uView; uniform float uProgress; uniform float uTime;
uniform float uSize; uniform vec2 uMouse;
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = aSeed * 0.42;
  float t = smoothstep(d, d + 0.58, uProgress);
  vec3 p = mix(aFrom, aTo, t);
  float fly = sin(t * 3.14159);
  p += fly * 0.28 * vec3(sin(aSeed * 41.0), cos(aSeed * 33.0), sin(aSeed * 19.0));
  p += 0.014 * vec3(sin(uTime * 1.3 + aSeed * 50.0), cos(uTime * 1.1 + aSeed * 70.0), sin(uTime * 0.9 + aSeed * 30.0));
  vec4 mv = uView * vec4(p, 1.0);
  vec2 dm = mv.xy - uMouse;
  float md = length(dm);
  mv.xy += (dm / max(md, 0.0001)) * 0.16 * exp(-md * md * 10.0);
  gl_Position = uProj * mv;
  gl_PointSize = uSize * (0.55 + fract(aSeed * 13.0) * 1.0) / -mv.z;
  vColor = aColor;
  vAlpha = 0.45 + 0.55 * fract(aSeed * 7.0);
}`
const FRAG = `
precision mediump float;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.0, length(c));
  gl_FragColor = vec4(vColor, a * a * vAlpha);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}

export default function ParticleHero({ className = '' }) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const [phase, setPhase] = useState(() => (prefersReducedMotion() ? 1 : 0))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = canvas.current
    const gl = el && el.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) { queueMicrotask(() => setFailed(true)); return }
    const reduced = prefersReducedMotion()
    const small = window.innerWidth < 768
    const n = small ? 3400 : 7000
    const r = rng(7)
    const shapes = { nebula: nebula(n, r), mark: mark(n, r), network: network(n, r) }

    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link')
    } catch (err) {
      console.warn('ParticleHero: WebGL unavailable, showing fallback', err)
      queueMicrotask(() => setFailed(true)); return
    }
    gl.useProgram(prog)

    // Per-particle colour: logo gradient (violet top-left → rose → red bottom) with white sparkles
    const seeds = new Float32Array(n); const colors = new Float32Array(n * 3)
    const m = shapes.mark
    for (let i = 0; i < n; i++) {
      seeds[i] = r()
      const t = Math.min(1, Math.max(0, (1 - m[i * 3 + 1]) / 2 + m[i * 3] * 0.15))
      let c = [0.69 + (0.88 - 0.69) * t, 0.28 + (0.27 - 0.28) * t, 0.73 + (0.48 - 0.73) * t] // #B048BA → #E0457B
      if (t > 0.8) c = [0.92, 0.25, 0.38]
      if (r() < 0.07) c = [1, 0.92, 0.96]
      colors.set(c, i * 3)
    }
    const buf = (data, name, size) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
      const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      return b
    }
    const fromBuf = buf(new Float32Array(shapes.nebula), 'aFrom', 3)
    const toBuf = buf(new Float32Array(reduced ? shapes.mark : shapes.nebula), 'aTo', 3)
    buf(seeds, 'aSeed', 1)
    buf(colors, 'aColor', 3)
    const U = (name) => gl.getUniformLocation(prog, name)
    const uProj = U('uProj'); const uView = U('uView'); const uProgress = U('uProgress')
    const uTime = U('uTime'); const uSize = U('uSize'); const uMouse = U('uMouse')

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
    gl.clearColor(0, 0, 0, 0)

    let w = 1; let h = 1; let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = el.clientWidth; h = el.clientHeight
      el.width = Math.max(1, Math.round(w * dpr)); el.height = Math.max(1, Math.round(h * dpr))
      gl.viewport(0, 0, el.width, el.height)
      gl.uniformMatrix4fv(uProj, false, perspective(0.78, w / Math.max(h, 1), 0.1, 20))
      gl.uniform1f(uSize, (small ? 19 : 17) * dpr * (h / 520))
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)

    // Pointer, in view-space units at the scene's depth
    const mouse = { x: 9, y: 9, tx: 9, ty: 9 }
    const onMove = (e) => {
      const b = el.getBoundingClientRect()
      const nx = ((e.clientX - b.left) / b.width) * 2 - 1; const ny = -(((e.clientY - b.top) / b.height) * 2 - 1)
      const half = Math.tan(0.39) * 3.2
      mouse.tx = nx * half * (w / h); mouse.ty = ny * half
    }
    const onLeave = () => { mouse.tx = 9; mouse.ty = 9 }
    window.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)

    // Phase sequencing: hold, then morph to the next shape
    let idx = reduced ? 1 : 0
    let phaseStart = performance.now()
    let morphing = false
    let progress = 1
    const setShape = (b, data) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data) }

    const draw = (now) => {
      const time = now / 1000
      mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08
      const tiltY = Math.sin(time * 0.18) * 0.3 + (mouse.tx < 5 ? mouse.x * 0.12 : 0)
      const tiltX = (mouse.ty < 5 ? -mouse.y * 0.1 : 0) + Math.sin(time * 0.13) * 0.06
      const spin = PHASES[idx].key === 'network' && !morphing ? (now - phaseStart) / 1000 * 0.25 : 0
      gl.uniformMatrix4fv(uView, false, mul(trans(0, 0, -3.2), mul(rotX(tiltX), rotY(tiltY + spin))))
      gl.uniform1f(uProgress, progress)
      gl.uniform1f(uTime, time)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.POINTS, 0, n)
    }

    if (reduced) {
      progress = 1
      draw(performance.now())
      return () => { ro.disconnect(); window.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave) }
    }

    let raf = 0; let running = false
    const tick = (now) => {
      const e = now - phaseStart
      if (!morphing && e > PHASES[idx].hold) {
        const next = (idx + 1) % PHASES.length
        setShape(fromBuf, shapes[PHASES[idx].key])
        setShape(toBuf, shapes[PHASES[next].key])
        idx = next; morphing = true; phaseStart = now; progress = 0
        setPhase(next)
      } else if (morphing) {
        progress = Math.min(1, e / MORPH_MS)
        if (progress >= 1) { morphing = false; phaseStart = now }
      }
      draw(now)
      raf = requestAnimationFrame(tick)
    }
    const startLoop = () => { if (!running) { running = true; phaseStart = performance.now() - (morphing ? progress * MORPH_MS : 0); raf = requestAnimationFrame(tick) } }
    const stopLoop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([en]) => (en.isIntersecting && !document.hidden ? startLoop() : stopLoop()), { threshold: 0.05 })
    io.observe(el)
    const onVis = () => (document.hidden ? stopLoop() : startLoop())
    document.addEventListener('visibilitychange', onVis)

    return () => {
      stopLoop(); io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave)
      // Leave the context alive: React may re-run this effect on the same canvas
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle,rgb(var(--grape-bright)/0.32),transparent_65%)] blur-3xl pointer-events-none" />
      {failed ? (
        <div className="relative aspect-square w-full flex items-center justify-center">
          <div className="w-1/2 aspect-square rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.5),transparent_65%)]" />
        </div>
      ) : (
        <canvas ref={canvas} className="relative block w-full aspect-square" aria-hidden="true" />
      )}
      <p className="relative -mt-4 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/55" aria-live="off">
        <span key={phase} className="anim-fade inline-block">{PHASES[phase].label}</span>
      </p>
    </div>
  )
}

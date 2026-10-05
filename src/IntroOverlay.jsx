// Brand intro, drawn live (no video): sharp at any resolution, no watermark,
// a few KB. Plays each time someone comes to the site (once per browser
// session). Sequence, ~5.4s:
//   ribbons of light fade in → scattered particles gather into the
//   eight-arrow mark → flash → the mark settles into the wordmark while the
//   letters reveal outward from it → light sweeps across → tagline →
//   particles burst and the overlay fades into the page.
// The play/skip decision is made before React boots by an inline script in
// index.html (adds `intro-playing` to <html>); this component removes it.
import { useEffect, useRef, useState } from 'react'
import { LogoLetters, LogoMarkArrows, LogoGlowDefs } from './Logo.jsx'
import { LOGO_W, LOGO_H, MARK } from './logoData'

const INTRO_PLAYED_KEY = 'datatrop_intro_played'
const FADE_MS = 700
// timeline (ms)
const T = { converge: [150, 1900], flash: [1700, 2250], travel: [2250, 3050], letters: [2650, 3450], markIn: [2850, 3200], shine: [3450, 4200], tagline: [3550, 4150], burst: [4500, 5300], exit: 4700 }
const END = T.exit + FADE_MS

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const local = (t, [a, b]) => clamp01((t - a) / (b - a))
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x) => 1 - Math.pow(1 - x, 3)

const introRequested = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('intro-playing')

// ── WebGL: full-screen light ribbons + particle mark ───────────────────────
const QUAD_VS = 'attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
const RIBBON_FS = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uAlpha;
vec3 ribbon(vec2 p, float off, float amp, float freq, float speed, float phase, vec3 col, float w) {
  float y = off + amp * sin(p.x * freq + uTime * speed + phase) + amp * 0.45 * sin(p.x * freq * 2.1 - uTime * speed * 0.6 + phase * 1.7);
  float d = abs(p.y - y);
  float core = exp(-d * d / (w * w * 0.015));
  float glow = exp(-d * d / (w * w));
  return col * (core * 0.85 + glow * 0.32);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2((uv.x - 0.5) * uRes.x / uRes.y, uv.y - 0.5);
  float g = clamp(uv.x * 0.7 + (1.0 - uv.y) * 0.5, 0.0, 1.0);
  vec3 bg = mix(vec3(0.227, 0.043, 0.125), vec3(0.02, 0.008, 0.016), g);
  bg += vec3(0.54, 0.16, 0.57) * 0.6 * smoothstep(0.6, 0.0, length((uv - vec2(0.1, 0.9)) * vec2(uRes.x / uRes.y, 1.0)));
  vec3 c = vec3(0.0);
  c += ribbon(p, -0.23, 0.15, 2.2, 0.35, 0.0, vec3(0.88, 0.27, 0.48), 0.07);
  c += ribbon(p, -0.2, 0.12, 2.8, -0.28, 1.3, vec3(0.69, 0.28, 0.73), 0.05);
  c += ribbon(p, -0.17, 0.09, 3.4, 0.42, 2.6, vec3(0.94, 0.55, 0.69), 0.035);
  c += ribbon(p, -0.3, 0.17, 1.6, -0.22, 4.0, vec3(0.76, 0.09, 0.36), 0.09);
  gl_FragColor = vec4(bg * (0.35 + 0.65 * uAlpha) + c * uAlpha, 1.0);
}`
const PTS_VS = `
attribute vec2 aStart; attribute vec2 aMark; attribute float aSeed; attribute vec3 aColor;
uniform vec2 uRes; uniform float uConverge; uniform vec2 uCenter; uniform float uR;
uniform float uBurst; uniform float uAlpha; uniform float uTime; uniform float uSize; uniform float uFlash;
varying vec3 vColor; varying float vA;
void main() {
  float d = aSeed * 0.45;
  float t = smoothstep(d, d + 0.55, uConverge);
  vec2 p = mix(aStart, uCenter + aMark * uR, t);
  p += (1.0 - t) * vec2(sin(uTime * 0.8 + aSeed * 60.0), cos(uTime * 0.7 + aSeed * 40.0)) * 14.0;
  vec2 dir = normalize(aMark + vec2(sin(aSeed * 91.0), cos(aSeed * 57.0)) * 0.35 + 0.0001);
  p += dir * uBurst * uBurst * uR * (2.5 + aSeed * 5.0);
  gl_Position = vec4(p.x / (uRes.x * 0.5), -p.y / (uRes.y * 0.5), 0.0, 1.0);
  gl_PointSize = uSize * (0.6 + aSeed * 0.9) * (1.0 + uFlash * 0.7);
  vColor = mix(aColor, vec3(1.0), uFlash * 0.45);
  vA = uAlpha * (1.0 - uBurst) * (0.45 + 0.55 * fract(aSeed * 7.0)) * (0.3 + 0.7 * t);
}`
const PTS_FS = `
precision mediump float;
varying vec3 vColor; varying float vA;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vColor, a * a * vA);
}`

const hexToRgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)

// Particle targets on the eight-arrow mark (unit radius) and scattered start points (px)
function markParticles(n, w, h) {
  const start = new Float32Array(n * 2); const mark = new Float32Array(n * 2)
  const seed = new Float32Array(n); const color = new Float32Array(n * 3)
  const cols = MARK.colors.map(hexToRgb)
  for (let i = 0; i < n; i++) {
    const k = i % 8
    const ang = ((-90 + k * 45) * Math.PI) / 180
    const ux = Math.cos(ang); const uy = Math.sin(ang)
    const roll = Math.random()
    let x; let y
    if (roll < 0.1) { // centre
      const rr = Math.random() * 0.08; const a = Math.random() * 6.283
      x = Math.cos(a) * rr; y = Math.sin(a) * rr
    } else if (roll < 0.8) { // shaft
      const t = 0.1 + Math.random() * 0.88
      x = ux * t; y = uy * t
    } else { // arrowhead barbs
      const side = Math.random() < 0.5 ? 1 : -1; const t = Math.random() * 0.2; const ba = ang + Math.PI + side * 0.5
      x = ux * 0.98 + Math.cos(ba) * t; y = uy * 0.98 + Math.sin(ba) * t
    }
    mark[i * 2] = x + (Math.random() - 0.5) * 0.02
    mark[i * 2 + 1] = y + (Math.random() - 0.5) * 0.02
    const a = Math.random() * 6.283; const rr = 0.35 + Math.random() * 0.75
    start[i * 2] = Math.cos(a) * rr * w * 0.6
    start[i * 2 + 1] = Math.sin(a) * rr * h * 0.6
    seed[i] = Math.random()
    color.set(Math.random() < 0.08 ? [1, 0.93, 0.97] : cols[k], i * 3)
  }
  return { start, mark, seed, color }
}

function program(gl, vs, fs) {
  const p = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
    gl.attachShader(p, s)
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link failed')
  return p
}

export default function IntroOverlay() {
  const canvas = useRef(null)
  const word = useRef(null)
  const [show, setShow] = useState(introRequested)
  const [leaving, setLeaving] = useState(false)
  const [t, setT] = useState(0)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    try { sessionStorage.setItem(INTRO_PLAYED_KEY, '1') } catch { /* storage blocked: may replay on refresh */ }
    setLeaving(true)
    document.documentElement.classList.remove('intro-playing')
    setTimeout(() => setShow(false), FADE_MS)
  }

  useEffect(() => {
    if (!show) return
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish() }
    window.addEventListener('keydown', onKey)

    // WebGL is optional: without it the wordmark still animates over the CSS gradient
    const el = canvas.current
    let gl = null; let ribbons; let pts; let quad; let attribs = {}; let n = 0
    try {
      gl = el && el.getContext('webgl', { antialias: false, alpha: false })
      if (gl) { ribbons = program(gl, QUAD_VS, RIBBON_FS); pts = program(gl, PTS_VS, PTS_FS) }
    } catch (err) {
      console.warn('Intro: WebGL unavailable, using the plain version', err)
      gl = null
    }

    let dpr = 1; let w = window.innerWidth; let h = window.innerHeight
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth; h = window.innerHeight
      if (gl) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); gl.viewport(0, 0, el.width, el.height) }
    }
    size()
    window.addEventListener('resize', size)

    if (gl) {
      n = w < 768 ? 2400 : 4800
      const P = markParticles(n, w, h)
      const mk = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b }
      quad = mk(new Float32Array([-1, -1, 3, -1, -1, 3]))
      attribs = { aStart: [mk(P.start), 2], aMark: [mk(P.mark), 2], aSeed: [mk(P.seed), 1], aColor: [mk(P.color), 3] }
    }
    const RU = gl && Object.fromEntries(['uRes', 'uTime', 'uAlpha'].map((k) => [k, gl.getUniformLocation(ribbons, k)]))
    const PU = gl && Object.fromEntries(['uRes', 'uConverge', 'uCenter', 'uR', 'uBurst', 'uAlpha', 'uTime', 'uSize', 'uFlash'].map((k) => [k, gl.getUniformLocation(pts, k)]))

    // Where the mark sits inside the wordmark, in px relative to screen centre
    const markTarget = () => {
      const r = word.current?.getBoundingClientRect()
      if (!r) return { x: 0, y: 0, R: 40 }
      const s = r.width / LOGO_W
      return { x: r.left + MARK.cx * s - w / 2, y: r.top + MARK.cy * s - h / 2, R: MARK.r * s }
    }

    const draw = (e) => {
      const time = e / 1000
      const target = markTarget()
      const bigR = Math.min(w, h) * 0.27
      const tr = ease(local(e, T.travel))

      gl.disable(gl.BLEND)
      gl.useProgram(ribbons)
      const aPos = gl.getAttribLocation(ribbons, 'aPos')
      gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      gl.uniform2f(RU.uRes, el.width, el.height)
      gl.uniform1f(RU.uTime, time)
      gl.uniform1f(RU.uAlpha, easeOut(clamp01(e / 900)))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.disableVertexAttribArray(aPos)

      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.useProgram(pts)
      const locs = Object.entries(attribs).map(([name, [buf, sz]]) => {
        const loc = gl.getAttribLocation(pts, name)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, 0, 0)
        return loc
      })
      gl.uniform2f(PU.uRes, w, h)
      gl.uniform1f(PU.uConverge, ease(local(e, T.converge)))
      gl.uniform2f(PU.uCenter, target.x * tr, target.y * tr)
      gl.uniform1f(PU.uR, bigR + (target.R - bigR) * tr)
      gl.uniform1f(PU.uBurst, easeOut(local(e, T.burst)))
      gl.uniform1f(PU.uAlpha, 1 - local(e, T.markIn) * 0.7)
      gl.uniform1f(PU.uTime, time)
      gl.uniform1f(PU.uSize, Math.max(2.8, 3.3 * dpr) * (w < 768 ? 1.1 : 1))
      gl.uniform1f(PU.uFlash, Math.sin(local(e, T.flash) * Math.PI))
      gl.drawArrays(gl.POINTS, 0, n)
      locs.forEach((loc) => gl.disableVertexAttribArray(loc))
    }

    const start = performance.now()
    let raf = 0
    const frame = (now) => {
      const e = now - start
      setT(e)
      if (gl) draw(e)
      if (e >= T.exit) finish()
      if (e < END) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', size)
      document.body.style.overflow = ''
      if (gl) {
        [quad, ...Object.values(attribs).map(([b]) => b)].forEach((b) => gl.deleteBuffer(b))
        gl.deleteProgram(ribbons); gl.deleteProgram(pts)
      }
    }
  }, [show])

  if (!show) return null

  // DOM layer: the crisp vector wordmark, revealed outward from the mark
  const lettersP = ease(local(t, T.letters))
  const markIn = local(t, T.markIn)
  const shine = local(t, T.shine)
  const tag = easeOut(local(t, T.tagline))
  const leftEdge = MARK.cx - MARK.cx * lettersP
  const rightEdge = MARK.cx + (LOGO_W - MARK.cx) * lettersP
  const shineX = -160 + shine * (LOGO_W + 320)

  return (
    <div
      className={`intro-overlay fixed inset-0 z-[100] bg-brand-gradient transition-opacity ease-out ${leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="dialog"
      aria-label="Datatrop intro"
    >
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-none">
        <svg
          ref={word}
          viewBox={`0 0 ${LOGO_W} ${LOGO_H}`}
          className="w-[min(82vw,880px)] h-auto overflow-visible"
          style={{ filter: 'drop-shadow(0 0 22px rgba(240,141,176,0.28))' }}
          role="img"
          aria-label="Datatrop"
        >
          <defs>
            <LogoGlowDefs />
            <clipPath id="intro-reveal">
              <rect x={leftEdge} y="-20" width={Math.max(0, rightEdge - leftEdge)} height={LOGO_H + 40} />
            </clipPath>
            <linearGradient id="intro-shine" gradientUnits="userSpaceOnUse" x1={shineX - 90} y1="0" x2={shineX + 90} y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath="url(#intro-reveal)" className="text-white" style={{ opacity: lettersP > 0 ? 1 : 0 }}>
            <LogoLetters />
            {shine > 0 && shine < 1 && <LogoLetters fill="url(#intro-shine)" />}
          </g>
          <g style={{ opacity: markIn }}>
            <LogoMarkArrows glow />
          </g>
        </svg>
        <p
          className="mt-8 sm:mt-10 font-display text-[11px] sm:text-[14px] tracking-[0.28em] sm:tracking-[0.42em] text-white/80 uppercase text-center [text-shadow:0_2px_12px_rgba(7,3,5,0.9)]"
          style={{ opacity: tag, transform: `translateY(${(1 - tag) * 10}px)` }}
        >
          Engineering impossibilities to reality
        </p>
      </div>

      <div className="absolute top-0 inset-x-0 flex justify-end p-4 sm:p-6" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
        <button
          type="button"
          onClick={finish}
          className="h-11 px-5 rounded-full border border-white/20 bg-black/30 backdrop-blur text-white text-sm hover:border-white/40 transition-colors"
        >
          Skip intro
        </button>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
        <div className="h-full bg-[linear-gradient(90deg,#8A2A91,#E0457B)]" style={{ width: `${Math.round(clamp01(t / T.exit) * 100)}%` }} />
      </div>
    </div>
  )
}

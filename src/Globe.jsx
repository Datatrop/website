// Hero globe: the Earth at night (NASA Black Marble 2016, public domain),
// slowly turning, with the everyday problems we solve pinned to real places.
// The globe is drawn in a WebGL fragment shader (ray-cast sphere + rim
// light); markers and leader lines go on a 2D canvas in front of it, and the labels are HTML
// so they stay crisp. Animates only while on screen; reduced-motion visitors
// get a still frame, and browsers without WebGL get the static photo.
import { useEffect, useRef, useState } from 'react'
import earthNight from './assets/home/earth-night.jpg'
import earthPhoto from './assets/home/hero-earth.jpg'

// [label, latitude, longitude, highlight]
const PLACES = [
  ['People', 19.1, 72.9],
  ['Processes', 50.1, 8.7],
  ['Real problems', -1.3, 36.8, true],
  ['Supply chains', -23.5, -46.6],
  ['Data', 40.7, -74.0],
  ['Technology', 35.7, 139.7],
]

const TILT = 0.38 // radians, shows a little more of the northern hemisphere
const SPIN = (Math.PI * 2) / 90 // one turn every 90s
const START = -1.1 // start with Africa / India facing the viewer

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`
const FRAG = `precision highp float;
uniform sampler2D tex; uniform vec2 center; uniform float radius; uniform float spin; uniform float tilt;
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
    vec3 lightCol = mix(vec3(0.90, 0.28, 0.50), vec3(1.0, 0.86, 0.93), lights * lights);
    vec3 col = base + lightCol * lights * 1.9;
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

// World point → screen offset (in globe radii, y up) and depth toward the viewer
function toScreen([x, y, z]) {
  return [x, y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT)]
}
function fromLatLon(lat, lon, spin) {
  const f = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180 + spin
  return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)]
}
/**
 * cx, cy: globe centre as a fraction of the box; size: radius as a fraction
 * of the box's smaller side (capped by `maxWidth` × box width).
 */
export default function Globe({ cx = 0.5, cy = 0.5, size = 0.36, maxWidth = 1, className = '' }) {
  const box = useRef(null)
  const glCanvas = useRef(null)
  const front = useRef(null)
  const labels = useRef([])
  const [fallback, setFallback] = useState(false)

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
    const uCenter = U('center'), uRadius = U('radius'), uSpin = U('spin'), uTilt = U('tilt')
    gl.uniform1f(uTilt, TILT)

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
      draw(time())
    }
    img.onerror = () => setFallback(true)
    img.src = earthNight

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const time = () => (still ? 0 : (performance.now() - t0) / 1000)
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false
    const fctx = front.current.getContext('2d')

    const resize = () => {
      const r = el.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = r.width; H = r.height
      for (const c of [cv, front.current]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
      gl.viewport(0, 0, cv.width, cv.height)
      draw(time())
    }

    const draw = (t) => {
      const R = Math.min(Math.min(W, H) * size, W * maxWidth)
      const X = W * cx, Y = H * cy
      const spin = START + t * SPIN
      // globe
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      if (ready) {
        gl.uniform2f(uCenter, X * dpr, (H - Y) * dpr)
        gl.uniform1f(uRadius, R * dpr)
        gl.uniform1f(uSpin, spin)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clearRect(0, 0, W, H)
      // pinned problems: only on the side facing us, fading at the edge
      PLACES.forEach(([, lat, lon, key], i) => {
        const [sx, sy, sz] = toScreen(fromLatLon(lat, lon, spin))
        const vis = Math.min(1, Math.max(0, (sz - 0.12) / 0.25))
        const label = labels.current[i]
        if (label) {
          label.style.opacity = vis
          if (vis <= 0) return
        }
        if (vis <= 0) return
        const x = X + sx * R, y = Y - sy * R
        // label sits outside the globe, along the line from its centre
        const dx = x - X, dy = y - Y, len = Math.hypot(dx, dy) || 1
        const lx = X + (dx / len) * (R * 1.12 + 26), ly = Y + (dy / len) * (R * 1.12 + 26)
        fctx.strokeStyle = `rgba(240,141,176,${0.55 * vis})`
        fctx.setLineDash([2, 3]); fctx.lineWidth = 1
        fctx.beginPath(); fctx.moveTo(x, y); fctx.lineTo(lx, ly); fctx.stroke(); fctx.setLineDash([])
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i)
        fctx.fillStyle = `rgba(224,69,123,${0.25 * vis * pulse})`
        fctx.beginPath(); fctx.arc(x, y, 6 + pulse * 6, 0, 7); fctx.fill()
        fctx.fillStyle = key ? `rgba(255,255,255,${vis})` : `rgba(240,141,176,${vis})`
        fctx.beginPath(); fctx.arc(x, y, key ? 4 : 3, 0, 7); fctx.fill()
        if (label) {
          // keep the label inside the box
          const lw = label.offsetWidth
          const left = Math.min(Math.max(dx >= 0 ? lx + 6 : lx - lw - 6, 4), W - lw - 4)
          label.style.transform = `translate(${left}px, ${ly}px) translateY(-50%)`
        }
      })
    }

    const loop = () => { draw(time()); raf = visible && !still ? requestAnimationFrame(loop) : 0 }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(loop)
    })
    const ro = new ResizeObserver(resize)
    ro.observe(el); io.observe(el)
    return () => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf) }
  }, [cx, cy, size, maxWidth])

  if (fallback) {
    return <img src={earthPhoto} alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full object-cover earth-img ${className}`} />
  }
  return (
    <div ref={box} className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      <canvas ref={glCanvas} className="absolute inset-0 w-full h-full" />
      <canvas ref={front} className="absolute inset-0 w-full h-full" />
      {PLACES.map(([text, , , key], i) => (
        <span
          key={text}
          ref={(n) => { labels.current[i] = n }}
          className={`absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] opacity-0 ${key ? 'text-white' : 'text-white/75'}`}
        >
          {text}
        </span>
      ))}
    </div>
  )
}

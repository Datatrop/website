// Vector Datatrop logo: crisp at any size (replaces the 754px PNG).
// Letters use currentColor, so set the text colour to recolour them; the
// eight-arrow mark keeps its brand gradient colours.
import { LOGO_W, LOGO_H, LETTERS_D, LETTERS_TRANSFORM, MARK } from './logoData'

function arrow(k) {
  const ang = ((-90 + k * 45) * Math.PI) / 180
  const r = k % 4 === 2 ? MARK.r + 5 : MARK.r // horizontal arrows are slightly longer
  const ux = Math.cos(ang); const uy = Math.sin(ang)
  const px = -uy; const py = ux
  const tip = [MARK.cx + ux * r, MARK.cy + uy * r]
  const base = [MARK.cx + ux * (r - 15), MARK.cy + uy * (r - 15)]
  const shaftEnd = [MARK.cx + ux * (r - 12), MARK.cy + uy * (r - 12)]
  const shaftStart = [MARK.cx + ux * 7, MARK.cy + uy * 7]
  const head = `${tip[0]},${tip[1]} ${base[0] + px * 6.5},${base[1] + py * 6.5} ${base[0] - px * 6.5},${base[1] - py * 6.5}`
  return { shaftStart, shaftEnd, head, color: MARK.colors[k] }
}
const ARROWS = Array.from({ length: 8 }, (_, k) => arrow(k))

// The mark alone, in logo coordinates (for use inside a 754×142 SVG)
export function LogoMarkArrows({ glow = false }) {
  return (
    <g>
      {glow && (
        <circle cx={MARK.cx} cy={MARK.cy} r="22" fill="url(#dt-mark-glow)" />
      )}
      {ARROWS.map((a, i) => (
        <g key={i}>
          <line x1={a.shaftStart[0]} y1={a.shaftStart[1]} x2={a.shaftEnd[0]} y2={a.shaftEnd[1]} stroke={a.color} strokeWidth="3.8" strokeLinecap="round" />
          <polygon points={a.head} fill={a.color} strokeLinejoin="round" stroke={a.color} strokeWidth="1.5" />
        </g>
      ))}
      <circle cx={MARK.cx} cy={MARK.cy} r="8" fill="#EC5FA4" opacity="0.45" />
      <circle cx={MARK.cx} cy={MARK.cy} r="4.5" fill="#FF8FC8" />
    </g>
  )
}

export function LogoLetters(props) {
  return (
    <g transform={LETTERS_TRANSFORM} fill="currentColor" {...props}>
      <path d={LETTERS_D} />
    </g>
  )
}

export function LogoGlowDefs() {
  return (
    <radialGradient id="dt-mark-glow">
      <stop offset="0" stopColor="#F08DB0" stopOpacity="0.9" />
      <stop offset="1" stopColor="#E0457B" stopOpacity="0" />
    </radialGradient>
  )
}

export default function Logo({ className = '', style, title = 'Datatrop AI Systems', glow = false }) {
  return (
    <svg viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} className={className} style={style} role="img" aria-label={title}>
      <title>{title}</title>
      {glow && <defs><LogoGlowDefs /></defs>}
      <LogoLetters />
      <LogoMarkArrows glow={glow} />
    </svg>
  )
}

// Animated illustrations that carry the site's story visually instead of in
// paragraphs: the hero systems diagram, before/after problem scenes, small
// "product UI" vignettes for each capability, and count-up stat dials.
// All are plain SVG + CSS (see the "viz-" rules in index.css), render a
// complete still frame for the pre-built HTML and for reduced-motion users,
// and only animate while on screen.
import { useState, useEffect } from 'react'
import { useInView, prefersReducedMotion } from './hooks'

const ROSE = '#E0457B'
const SOFT = '#F08DB0'
const GRAPE = '#B048BA'
const AMBER = '#F6C453'
const INK = '#14060D'
const LINE = 'rgba(255,255,255,0.16)'
const FAINT = 'rgba(255,255,255,0.05)'

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// ═══════════════════════════════════════════════════════════════════════════════
// HOW WE WORK — scroll-driven: problem → root cause → scale → tools → solution
// `p` is 0..1 scroll progress through the pinned section.
// ═══════════════════════════════════════════════════════════════════════════════
const CX = 260
const CY = 260
const SYMPTOMS = [[118, 118, 'Costs rising'], [402, 126, 'Growth stalled'], [112, 392, 'Teams overloaded'], [408, 386, 'No clear data']]
const SCALE_RINGS = [[96, '1×'], [146, '10×'], [196, '100×']]
const TOOLS = [['Automation', true], ['ERP', true], ['Custom software', false], ['AI agents', true], ['Data & BI', false], ['Process redesign', true]]
const toolPos = (i) => [20 + (i % 3) * 166, i < 3 ? 470 : 516]
const OUTCOMES = [['Cost', '↓'], ['Capacity', '↑'], ['Ready to scale', '✓']]

// local 0..1 for p within [a, b], eased
const seg = (p, a, b) => easeInOut(Math.min(1, Math.max(0, (p - a) / (b - a))))
const mono = { fontFamily: 'JetBrains Mono, monospace', letterSpacing: 2 }

export function StoryDiagram({ p }) {
  const context = 1 - seg(p, 0.14, 0.22)
  const trace = seg(p, 0.2, 0.32) // symptoms traced back to the knot
  const symptoms = 1 - seg(p, 0.34, 0.42)
  const rootCause = seg(p, 0.28, 0.34) * (1 - seg(p, 0.42, 0.48))
  const scanning = p > 0.18 && p < 0.44
  const rings = seg(p, 0.4, 0.56)
  const ringsDim = 1 - 0.65 * seg(p, 0.6, 0.7)
  const tools = seg(p, 0.56, 0.64)
  const pick = seg(p, 0.66, 0.74)
  const knot = 1 - seg(p, 0.64, 0.74)
  const blueprint = seg(p, 0.64, 0.74) * (1 - seg(p, 0.8, 0.88))
  const solution = seg(p, 0.8, 0.9)
  const outcomes = seg(p, 0.88, 0.97)

  return (
    <svg viewBox="0 0 520 580" className="w-full h-full" role="img"
      aria-label="A problem and its symptoms are traced to the root cause, planned for scale, solved with the right mix of tools, and delivered as one working solution.">
      <defs>
        <radialGradient id="st-core">
          <stop offset="0" stopColor={SOFT} />
          <stop offset="0.45" stopColor={ROSE} stopOpacity="0.85" />
          <stop offset="1" stopColor="#6B1E72" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id="st-knot">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.28" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1 · whose problem: any company, sector or region */}
      <text x={CX} y="34" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" opacity={context} {...mono}>A COMPANY · A SECTOR · A REGION</text>

      {/* 3 · scale rings */}
      <g opacity={rings * ringsDim}>
        {SCALE_RINGS.map(([r, label], i) => {
          const rr = r * (0.6 + 0.4 * seg(p, 0.4 + i * 0.04, 0.5 + i * 0.04))
          return (
            <g key={label}>
              <circle cx={CX} cy={CY} r={rr} fill="none" stroke={SOFT} strokeOpacity={0.5 - i * 0.12} strokeDasharray="3 7" />
              <g transform={`translate(${CX + rr * 0.72} ${CY - rr * 0.72})`}>
                <rect x="-22" y="-12" width="44" height="22" rx="11" fill={INK} stroke="rgba(240,141,176,0.5)" />
                <text y="4" textAnchor="middle" fill={SOFT} fontFamily="Sora, sans-serif" fontSize="11.5" fontWeight="600">{label}</text>
              </g>
            </g>
          )
        })}
        <text x={CX} y={CY + 230} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" opacity={1 - tools} {...mono}>PLANNED FOR 100× THE LOAD</text>
      </g>

      {/* 2 · symptoms traced back to one cause */}
      <g opacity={symptoms}>
        {SYMPTOMS.map(([x, y, t], i) => (
          <g key={t}>
            <line x1={x} y1={y} x2={x + (CX - x) * trace} y2={y + (CY - y) * trace} stroke={SOFT} strokeOpacity="0.6" strokeWidth="1.3" strokeDasharray="4 5" />
            <g transform={`translate(${x} ${y})`}>
              <g className="viz-bob" style={{ animationDelay: `${i * 0.4}s` }}>
                <rect x={-(t.length * 3.3 + 18)} y="-12" width={t.length * 6.6 + 36} height="24" rx="12" fill="rgba(246,196,83,0.14)" stroke={AMBER} strokeOpacity="0.7" />
                <circle cx={-(t.length * 3.3 + 5)} cy="0" r="4" fill={AMBER} />
                <text x="6" y="4" textAnchor="middle" fill={AMBER} fontFamily="Inter, sans-serif" fontSize="11.5">{t}</text>
              </g>
            </g>
          </g>
        ))}
      </g>

      {/* the problem itself: a tangled knot */}
      <g transform={`translate(${CX} ${CY}) scale(${0.85 + 0.15 * knot})`} opacity={knot}>
        <circle r="78" fill="url(#st-knot)" />
        <g className="viz-knot">
          {[0, 36, 72, 108, 144].map((a, i) => (
            <ellipse key={a} rx={50 - i * 3} ry={16 + i * 2} transform={`rotate(${a})`} fill="none" stroke={AMBER} strokeOpacity="0.75" strokeWidth="1.6" />
          ))}
        </g>
        <circle r="5" fill={AMBER} />
        <text y="86" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="11" opacity={(1 - rootCause) * (1 - seg(p, 0.42, 0.48))} {...mono}>THE PROBLEM</text>
      </g>

      {/* 2 · diagnosis: scanner around the knot */}
      {scanning && (
        <g transform={`translate(${CX} ${CY}) rotate(${seg(p, 0.18, 0.44) * 540})`} opacity={Math.sin(seg(p, 0.18, 0.44) * Math.PI)}>
          <circle r="66" fill="none" stroke={SOFT} strokeOpacity="0.3" />
          <path d="M0 0 L66 0 A66 66 0 0 1 46.7 46.7 Z" fill={SOFT} fillOpacity="0.16" />
          <line x2="66" stroke={SOFT} strokeWidth="1.5" />
        </g>
      )}
      <g opacity={rootCause} transform={`translate(${CX} ${CY + 92})`}>
        <rect x="-74" y="-14" width="148" height="28" rx="14" fill="rgba(224,69,123,0.2)" stroke={SOFT} />
        <text y="4.5" textAnchor="middle" fill="#fff" fontSize="11.5" {...mono}>ROOT CAUSE FOUND</text>
      </g>

      {/* 4 · system design blueprint */}
      <g opacity={blueprint} transform={`translate(${CX} ${CY})`}>
        <rect x="-70" y="-70" width="140" height="140" rx="20" fill="rgba(255,255,255,0.03)" stroke={SOFT} strokeOpacity="0.7" strokeDasharray="5 5" />
        {[-35, 0, 35].map((v) => (
          <g key={v} stroke="rgba(255,255,255,0.12)"><line x1={v} y1="-62" x2={v} y2="62" /><line x1="-62" y1={v} x2="62" y2={v} /></g>
        ))}
        <text y="4" textAnchor="middle" fill="#fff" fontSize="11" {...mono}>SYSTEM DESIGN</text>
      </g>

      {/* 4–5 · picked tools feed the solution */}
      <g opacity={solution}>
        {TOOLS.map(([, picked], i) => {
          if (!picked) return null
          const [x, y] = toolPos(i)
          return (
            <g key={i}>
              <line x1={x + 74} y1={y - 18} x2={CX} y2={CY} stroke="rgba(240,141,176,0.22)" strokeWidth="1.2" />
              <line x1={x + 74} y1={y - 18} x2={CX} y2={CY} stroke={SOFT} strokeWidth="2.2" strokeLinecap="round" className="viz-flow" style={{ animationDelay: `${i * -0.25}s` }} />
            </g>
          )
        })}
      </g>

      {/* 4 · the toolbox: we pick what fits, not one fixed product */}
      <g opacity={tools} transform={`translate(0 ${(1 - tools) * 14})`}>
        {TOOLS.map(([t, picked], i) => {
          const [x, y] = toolPos(i)
          const on = picked ? pick : 0
          const dim = picked ? 1 : 1 - 0.55 * pick
          return (
            <g key={t} transform={`translate(${x} ${y - 18})`} opacity={dim}>
              <rect width="148" height="36" rx="18" fill={on ? `rgba(224,69,123,${0.08 + 0.16 * on})` : INK} stroke={on ? `rgba(240,141,176,${0.3 + 0.4 * on})` : 'rgba(255,255,255,0.18)'} />
              <text x="18" y="22.5" fill="rgba(255,255,255,0.88)" fontFamily="Inter, sans-serif" fontSize="12.5">{t}</text>
              {picked && <g opacity={on}><Check x={134} y={18} r={7} /></g>}
            </g>
          )
        })}
      </g>

      {/* 5 · the delivered solution */}
      <g transform={`translate(${CX} ${CY}) scale(${0.3 + 0.7 * solution})`} opacity={solution}>
        <circle r="70" fill="url(#st-core)" />
        <circle r="70" fill="none" stroke="rgba(255,255,255,0.35)" />
        <circle r="84" fill="none" stroke={SOFT} strokeOpacity="0.35" className="viz-ping" />
        <text y="-2" textAnchor="middle" fill="#fff" fontFamily="Sora, Inter, sans-serif" fontSize="17" fontWeight="600" letterSpacing="1.5">SOLVED</text>
        <text y="18" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontFamily="Inter, sans-serif" fontSize="11.5">live &amp; measured</text>
      </g>

      {/* 5 · outcomes */}
      <g opacity={outcomes} transform={`translate(0 ${(1 - outcomes) * -10})`}>
        {OUTCOMES.map(([t, mark], i) => (
          <g key={t} transform={`translate(${20 + i * 166} 16)`}>
            <rect width="148" height="36" rx="18" fill="rgba(224,69,123,0.16)" stroke="rgba(240,141,176,0.55)" />
            <text x="18" y="23" fill="#fff" fontFamily="Inter, sans-serif" fontSize="13">{t}</text>
            <text x="130" y="24" textAnchor="end" fill={SOFT} fontFamily="Sora, sans-serif" fontSize="16" fontWeight="600">{mark}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROBLEMS — before / after scenes
// ═══════════════════════════════════════════════════════════════════════════════

const Txt = ({ x, y, children, size = 11, fill = 'rgba(255,255,255,0.7)', anchor = 'start', weight = 400 }) => (
  <text x={x} y={y} fill={fill} fontSize={size} fontWeight={weight} textAnchor={anchor} fontFamily="Inter, sans-serif">{children}</text>
)
const Bar = ({ x, y, w, h = 6, fill = 'rgba(255,255,255,0.18)', r = 3 }) => <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
const Cross = ({ x, y }) => (
  <g stroke={AMBER} strokeWidth="2" strokeLinecap="round"><line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} /><line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} /></g>
)
const Check = ({ x, y, r = 8 }) => (
  <g transform={`translate(${x} ${y})`}><circle r={r} fill="rgba(224,69,123,0.22)" stroke={SOFT} /><path d={`M${-r * 0.4} 0 l${r * 0.3} ${r * 0.3} l${r * 0.55} ${-r * 0.6}`} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></g>
)
const Person = ({ x, y, s = 1, fill = 'rgba(255,255,255,0.75)' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}><circle cy="-12" r="8" /><path d="M-14 14 a14 14 0 0 1 28 0 z" /></g>
)
const AgentTile = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-16" y="-16" width="32" height="32" rx="9" fill="rgba(224,69,123,0.35)" stroke={SOFT} strokeOpacity="0.7" />
    <Txt x={0} y={4} size={11} fill="#fff" anchor="middle" weight={600}>AI</Txt>
  </g>
)

function SceneFragmented({ after }) {
  const sheets = [[30, 34], [190, 20], [356, 40], [64, 182], [222, 168], [372, 196]]
  const links = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [2, 5]]
  const c = (i) => [sheets[i][0] + 32, sheets[i][1] + 40]
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        {links.map(([a, b], i) => {
          const [x1, y1] = c(a); const [x2, y2] = c(b)
          return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={AMBER} strokeOpacity="0.4" strokeDasharray="4 6" /><Cross x={(x1 + x2) / 2} y={(y1 + y2) / 2} /></g>
        })}
        {sheets.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(i % 2 ? 1 : -1) * (4 + i)} 32 40)`}>
            <rect width="64" height="80" rx="6" fill={INK} stroke={LINE} />
            <rect width="64" height="13" rx="6" fill="rgba(246,196,83,0.28)" />
            {[30, 45, 60].map((yy) => <line key={yy} x1="6" x2="58" y1={yy} y2={yy} stroke="rgba(255,255,255,0.12)" />)}
            {[22, 43].map((xx) => <line key={xx} y1="18" y2="74" x1={xx} x2={xx} stroke="rgba(255,255,255,0.12)" />)}
          </g>
        ))}
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(246,196,83,0.85)">Spreadsheets, copied data, manual hand-offs</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        <rect x="60" y="22" width="360" height="248" rx="14" fill={INK} stroke="rgba(240,141,176,0.45)" />
        <rect x="60" y="22" width="74" height="248" rx="14" fill="rgba(224,69,123,0.10)" />
        {['Sales', 'Stock', 'Dispatch', 'Finance', 'HR'].map((n, i) => (
          <g key={n}><circle cx="76" cy={52 + i * 30} r="3.5" fill={i === 0 ? SOFT : 'rgba(255,255,255,0.4)'} /><Txt x={86} y={56 + i * 30} size={10.5}>{n}</Txt></g>
        ))}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${150 + i * 88} 40)`}>
            <rect width="78" height="50" rx="9" fill={FAINT} stroke="rgba(255,255,255,0.08)" />
            <Bar x={10} y={12} w={30} h={5} />
            <Bar x={10} y={26} w={48 - i * 8} h={11} fill={i === 1 ? SOFT : 'rgba(255,255,255,0.55)'} r={4} />
          </g>
        ))}
        <defs><linearGradient id="fr-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROSE} stopOpacity="0.35" /><stop offset="1" stopColor={ROSE} stopOpacity="0" /></linearGradient></defs>
        <path d="M150 246 C 185 228, 205 236, 236 206 S 296 168, 326 176 S 376 134, 404 120 L 404 254 L 150 254 Z" fill="url(#fr-area)" />
        <path d="M150 246 C 185 228, 205 236, 236 206 S 296 168, 326 176 S 376 134, 404 120" fill="none" stroke={ROSE} strokeWidth="2.5" strokeLinecap="round" className="viz-draw" />
        <circle cx="404" cy="120" r="4.5" fill="#fff" className="viz-pulse-dot" />
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(240,141,176,0.9)">One live operating platform</Txt>
      </g>
    </>
  )
}

function Funnel({ stroke }) {
  return <path d="M110 34 L370 34 L292 150 L292 236 L188 236 L188 150 Z" fill="rgba(255,255,255,0.03)" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
}

function SceneLeakage({ after }) {
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        <Funnel stroke={LINE} />
        {[[150, 70], [330, 70], [205, 120], [276, 118]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={AMBER} className="viz-leak" style={{ animationDelay: `${i * 0.45}s`, '--dx': `${x < 240 ? -26 : 26}px` }} />
          </g>
        ))}
        {[[170, 48], [240, 46], [310, 48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="rgba(255,255,255,0.7)" />)}
        <Txt x={60} y={116} fill="rgba(246,196,83,0.85)">missed</Txt>
        <Txt x={382} y={116} fill="rgba(246,196,83,0.85)">no follow-up</Txt>
        <rect x="214" y="250" width="52" height="12" rx="6" fill="rgba(255,255,255,0.2)" />
        <Txt size={14} x={240} y={290} anchor="middle" fill="rgba(246,196,83,0.85)">Leads slip out at every stage</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        <Funnel stroke="rgba(240,141,176,0.6)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={i} cx={200 + (i % 3) * 40} cy="48" r="4.5" fill={SOFT} className="viz-pour" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
        <rect x="150" y="250" width="180" height="12" rx="6" fill={ROSE} className="viz-grow-x" />
        <Txt size={14} x={240} y={290} anchor="middle" fill="rgba(240,141,176,0.9)">Every lead tracked, scored and followed up</Txt>
      </g>
    </>
  )
}

const CHANNELS = [['Calls', 70, 56], ['WhatsApp', 64, 150], ['Email', 76, 244], ['Web chat', 404, 70], ['Social', 412, 226]]

function SceneCommunication({ after }) {
  const people = [[240, 92], [210, 196], [286, 176]]
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        {CHANNELS.map(([, x, y], i) => people.map(([px, py], j) => ((i + j) % 2 === 0 ? (
          <line key={`${i}-${j}`} x1={x} y1={y} x2={px} y2={py} stroke={AMBER} strokeOpacity="0.32" strokeDasharray="4 6" />
        ) : null)))}
        {CHANNELS.map(([n, x, y]) => (
          <g key={n}><circle cx={x} cy={y} r="22" fill={INK} stroke={LINE} /><Txt x={x} y={y + 4} size={9.5} anchor="middle">{n}</Txt></g>
        ))}
        {people.map(([x, y], i) => <Person key={i} x={x} y={y} s={0.85} />)}
        {[[262, 76], [232, 180], [308, 160]].map(([x, y], i) => (
          <g key={i}><circle cx={x} cy={y} r="8" fill={AMBER} /><Txt x={x} y={y + 3.5} size={10} fill={INK} anchor="middle" weight={700}>!</Txt></g>
        ))}
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(246,196,83,0.85)">Calls on personal phones, nobody sees the full picture</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        <rect x="70" y="20" width="340" height="250" rx="14" fill={INK} stroke="rgba(240,141,176,0.45)" />
        <Txt x={90} y={46} size={12} fill="#fff" weight={600}>Unified inbox</Txt>
        <rect x="318" y="33" width="74" height="20" rx="10" fill="rgba(224,69,123,0.18)" />
        <Txt x={355} y={47} size={10} fill={SOFT} anchor="middle">AI summaries</Txt>
        {CHANNELS.map(([n], i) => (
          <g key={n} transform={`translate(86 ${66 + i * 38})`}>
            <rect width="308" height="30" rx="8" fill={FAINT} />
            <circle cx="16" cy="15" r="5" fill={[SOFT, GRAPE, ROSE, SOFT, GRAPE][i]} />
            <Txt x={30} y={19} size={10.5}>{n}</Txt>
            <Bar x={100} y={12} w={110 - i * 12} />
            <rect x="236" y="7" width="62" height="16" rx="8" fill={i < 3 ? 'rgba(224,69,123,0.22)' : 'rgba(255,255,255,0.08)'} />
            <Txt x={267} y={19} size={9.5} anchor="middle" fill={i < 3 ? SOFT : 'rgba(255,255,255,0.6)'}>{i < 3 ? 'resolved' : 'assigned'}</Txt>
          </g>
        ))}
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(240,141,176,0.9)">Every conversation in one place, with accountability</Txt>
      </g>
    </>
  )
}

function SceneKnowledge({ after }) {
  const nodes = [[110, 90], [370, 84], [96, 214], [384, 208], [180, 252], [300, 256], [240, 60]]
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        {[[110, 120], [240, 150], [370, 120]].map(([x, y], i) => (
          <g key={i}>
            <Person x={x} y={y} s={1.1} fill="rgba(255,255,255,0.55)" />
            {[0, 1].map((k) => (
              <g key={k} transform={`translate(${x - 30 + k * 34} ${y + 34}) rotate(${k ? 8 : -8})`}>
                <rect width="26" height="32" rx="4" fill={INK} stroke={LINE} />
                <Bar x={5} y={9} w={16} h={3} /><Bar x={5} y={16} w={12} h={3} />
              </g>
            ))}
          </g>
        ))}
        {[[60, 40], [420, 46], [250, 236]].map(([x, y], i) => (
          <g key={i} opacity="0.35" transform={`translate(${x} ${y})`}><rect width="26" height="32" rx="4" fill="none" stroke={AMBER} strokeDasharray="3 3" /><Txt x={13} y={21} anchor="middle" fill={AMBER} size={13}>?</Txt></g>
        ))}
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(246,196,83,0.85)">Know-how lives in people's heads and inboxes</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        <rect x="140" y="16" width="200" height="28" rx="14" fill={INK} stroke="rgba(240,141,176,0.5)" />
        <Txt x={160} y={34} size={11}>Ask anything…</Txt>
        <circle cx="318" cy="30" r="7" fill="rgba(224,69,123,0.35)" />
        {nodes.map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2="240" y2="160" stroke={SOFT} strokeOpacity="0.45" className="viz-flow" style={{ animationDelay: `${i * -0.25}s` }} />
        ))}
        {nodes.map(([x, y], i) => (i % 2 ? (
          <Person key={i} x={x} y={y + 6} s={0.7} fill="rgba(255,255,255,0.75)" />
        ) : (
          <g key={i} transform={`translate(${x - 12} ${y - 15})`}><rect width="24" height="30" rx="4" fill={INK} stroke="rgba(240,141,176,0.6)" /><Bar x={5} y={9} w={14} h={3} fill="rgba(240,141,176,0.6)" /></g>
        )))}
        <circle cx="240" cy="160" r="34" fill={INK} />
        <circle cx="240" cy="160" r="34" fill="rgba(224,69,123,0.3)" stroke={SOFT} />
        <Txt x={240} y={157} anchor="middle" size={10.5} fill="#fff" weight={600}>Company</Txt>
        <Txt x={240} y={171} anchor="middle" size={10.5} fill="#fff" weight={600}>memory</Txt>
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(240,141,176,0.9)">Searchable institutional memory everyone can use</Txt>
      </g>
    </>
  )
}

function SceneDependency({ after }) {
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        <Person x={150} y={210} s={2} fill="rgba(255,255,255,0.6)" />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={250 + (i % 2) * 6} y={238 - i * 24} width="140" height="18" rx="5"
            fill={i > 5 ? 'rgba(246,196,83,0.35)' : 'rgba(255,255,255,0.12)'} stroke={i > 5 ? AMBER : 'none'} strokeOpacity="0.6"
            transform={`rotate(${(i % 3) - 1} 320 ${247 - i * 24})`} />
        ))}
        <Txt x={322} y={22} anchor="middle" fill="rgba(246,196,83,0.9)">backlog</Txt>
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(246,196,83,0.85)">Repetitive work piles up on a few people</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        {[0, 1, 2].map((r) => (
          <g key={r} transform={`translate(70 ${48 + r * 66})`}>
            <AgentTile x={16} y={16} />
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <rect x={48 + k * 76} y="8" width="64" height="16" rx="5" fill="rgba(255,255,255,0.06)" />
                <rect x={48 + k * 76} y="8" width="64" height="16" rx="5" fill="rgba(224,69,123,0.45)" className="viz-fill" style={{ animationDelay: `${(r * 3 + k) * 0.25}s` }} />
              </g>
            ))}
            <Check x={290} y={16} />
          </g>
        ))}
        <Person x={385} y={236} s={1.1} />
        <rect x="342" y="252" width="86" height="20" rx="10" fill="rgba(224,69,123,0.22)" stroke={SOFT} strokeOpacity="0.6" />
        <Txt x={385} y={266} anchor="middle" size={10} fill={SOFT}>approve</Txt>
        <Txt size={14} x={60} y={292} fill="rgba(240,141,176,0.9)">AI agents do the routine work; people decide</Txt>
      </g>
    </>
  )
}

function SceneDelay({ after }) {
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        <rect x="100" y="30" width="280" height="224" rx="12" fill={INK} stroke={LINE} />
        <Txt x={120} y={58} size={12} fill="rgba(255,255,255,0.8)" weight={600}>Monthly report.xlsx</Txt>
        {[60, 90, 50, 110, 80, 70].map((h, i) => <rect key={i} x={128 + i * 38} y={232 - h} width="22" height={h} rx="3" fill="rgba(255,255,255,0.14)" />)}
        <rect x="236" y="44" width="128" height="20" rx="10" fill="rgba(246,196,83,0.18)" />
        <Txt x={300} y={58} anchor="middle" size={10} fill={AMBER}>updated 7 days ago</Txt>
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(246,196,83,0.85)">Leadership decides on week-old numbers</Txt>
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        <rect x="100" y="30" width="280" height="224" rx="12" fill={INK} stroke="rgba(240,141,176,0.45)" />
        <Txt x={120} y={58} size={12} fill="#fff" weight={600}>Operations, live</Txt>
        <rect x="312" y="44" width="52" height="20" rx="10" fill="rgba(224,69,123,0.22)" />
        <circle cx="326" cy="54" r="3.5" fill={ROSE} className="viz-blink" />
        <Txt x={346} y={58} anchor="middle" size={10} fill={SOFT}>live</Txt>
        <path d="M124 214 C 160 200, 176 210, 204 182 S 252 150, 280 160 S 330 118, 356 104" fill="none" stroke={ROSE} strokeWidth="2.5" strokeLinecap="round" className="viz-draw" />
        <circle cx="356" cy="104" r="5" fill="#fff" className="viz-pulse-dot" />
        <Txt size={14} x={240} y={292} anchor="middle" fill="rgba(240,141,176,0.9)">Real-time visibility for every decision</Txt>
      </g>
    </>
  )
}

function SceneGeneric({ after }) {
  const pts = [[90, 70], [200, 50], [330, 80], [400, 160], [310, 230], [170, 240], [80, 170], [240, 150]]
  return (
    <>
      <g className="viz-layer" style={{ opacity: after ? 0 : 1 }}>
        {pts.map(([x, y], i) => <circle key={i} cx={x + ((i * 37) % 30) - 15} cy={y + ((i * 23) % 30) - 15} r="7" fill="rgba(255,255,255,0.35)" />)}
      </g>
      <g className="viz-layer" style={{ opacity: after ? 1 : 0 }}>
        {pts.slice(0, 7).map(([x, y], i) => <line key={i} x1={x} y1={y} x2="240" y2="150" stroke={SOFT} strokeOpacity="0.5" className="viz-flow" />)}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 7 ? 18 : 7} fill={i === 7 ? 'rgba(224,69,123,0.5)' : SOFT} />)}
      </g>
    </>
  )
}

const SCENES = {
  fragmented: SceneFragmented,
  leakage: SceneLeakage,
  communication: SceneCommunication,
  knowledge: SceneKnowledge,
  dependency: SceneDependency,
  delay: SceneDelay,
  generic: SceneGeneric,
}

export function ProblemScene({ kind, after, label }) {
  const Scene = SCENES[kind] || SceneGeneric
  return (
    <svg viewBox="0 0 480 300" className="w-full h-auto" role="img" aria-label={label}>
      <Scene after={after} />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAPABILITIES — small animated product vignettes
// ═══════════════════════════════════════════════════════════════════════════════

function VizEnterprise() {
  const boxes = [['Sales', 52, 44], ['Stock', 52, 116], ['Finance', 52, 188], ['HR', 388, 44], ['Dispatch', 388, 116], ['Support', 388, 188]]
  return (
    <svg viewBox="0 0 440 232" className="w-full h-full" aria-hidden="true">
      {boxes.map(([n, x, y], i) => (
        <g key={n}>
          <line x1={x} y1={y} x2="220" y2="116" stroke="rgba(240,141,176,0.25)" />
          <line x1={x} y1={y} x2="220" y2="116" stroke={SOFT} strokeWidth="2" strokeLinecap="round" className="viz-flow" style={{ animationDelay: `${i * -0.3}s` }} />
        </g>
      ))}
      <circle cx="220" cy="116" r="44" fill={INK} />
      <circle cx="220" cy="116" r="44" fill="rgba(224,69,123,0.3)" stroke={SOFT} />
      <circle cx="220" cy="116" r="56" fill="none" stroke={SOFT} strokeOpacity="0.3" className="viz-ping" />
      <Txt x={220} y={113} anchor="middle" size={11} fill="#fff" weight={600}>AI operating</Txt>
      <Txt x={220} y={127} anchor="middle" size={11} fill="#fff" weight={600}>platform</Txt>
      {boxes.map(([n, x, y]) => (
        <g key={n} transform={`translate(${x} ${y})`}>
          <rect x="-44" y="-15" width="88" height="30" rx="9" fill={INK} stroke="rgba(255,255,255,0.2)" />
          <Txt x={0} y={4} anchor="middle" size={11}>{n}</Txt>
        </g>
      ))}
    </svg>
  )
}

function VizWorkforce() {
  const rows = ['Invoice matching', 'Lead follow-ups', 'Daily reporting']
  return (
    <svg viewBox="0 0 320 132" className="w-full h-full" aria-hidden="true">
      {rows.map((r, i) => (
        <g key={r} transform={`translate(8 ${10 + i * 40})`}>
          <AgentTile x={14} y={14} s={0.8} />
          <Txt x={36} y={11} size={10.5}>{r}</Txt>
          <rect x="36" y="18" width="226" height="7" rx="3.5" fill="rgba(255,255,255,0.08)" />
          <rect x="36" y="18" width="226" height="7" rx="3.5" fill={ROSE} className="viz-fill" style={{ animationDelay: `${i * 0.7}s` }} />
          <g className="viz-check" style={{ animationDelay: `${i * 0.7}s` }}><Check x={286} y={20} r={8} /></g>
        </g>
      ))}
    </svg>
  )
}

function VizRevenue() {
  const stages = [['Leads', 1], ['Qualified', 0.74], ['Proposal', 0.52], ['Won', 0.36]]
  return (
    <svg viewBox="0 0 320 132" className="w-full h-full" aria-hidden="true">
      {stages.map(([n, w], i) => (
        <g key={n} transform={`translate(8 ${10 + i * 29})`}>
          <Txt x={0} y={14} size={10.5}>{n}</Txt>
          <rect x="64" y="4" width={190 * w} height="14" rx="5" fill={i === 3 ? ROSE : `rgba(240,141,176,${0.55 - i * 0.1})`} className="viz-grow-x" style={{ animationDelay: `${i * 0.25}s` }} />
        </g>
      ))}
      <path d="M262 108 L274 96 L284 100 L296 80 L310 70" fill="none" stroke={SOFT} strokeWidth="2" strokeLinecap="round" className="viz-draw" />
      <circle cx="310" cy="70" r="3.5" fill="#fff" className="viz-pulse-dot" />
    </svg>
  )
}

function VizCommunication() {
  return (
    <svg viewBox="0 0 320 132" className="w-full h-full" aria-hidden="true">
      {Array.from({ length: 34 }).map((_, i) => {
        const h = 10 + Math.abs(Math.sin(i * 0.9) * 34) + (i % 4) * 4
        return <rect key={i} x={10 + i * 9} y={54 - h / 2} width="4.5" height={h} rx="2.2" fill={i % 7 === 3 ? ROSE : 'rgba(240,141,176,0.6)'} className="viz-wave" style={{ animationDelay: `${(i % 9) * 0.11}s` }} />
      })}
      {[['Summary', 10], ['Sentiment: positive', 86], ['Next step', 222]].map(([t, x], i) => (
        <g key={t} transform={`translate(${x} 98)`}>
          <g className="viz-chip" style={{ animationDelay: `${0.4 + i * 0.35}s` }}>
            <rect width={t.length * 5.9 + 20} height="22" rx="11" fill="rgba(224,69,123,0.18)" stroke="rgba(240,141,176,0.5)" />
            <Txt x={10} y={15} size={10.5} fill={SOFT}>{t}</Txt>
          </g>
        </g>
      ))}
    </svg>
  )
}

function VizProduct() {
  return (
    <svg viewBox="0 0 320 132" className="w-full h-full" aria-hidden="true">
      <rect x="86" y="6" width="148" height="120" rx="12" fill={INK} stroke="rgba(255,255,255,0.2)" />
      <circle cx="100" cy="18" r="2.5" fill="rgba(255,255,255,0.3)" /><circle cx="109" cy="18" r="2.5" fill="rgba(255,255,255,0.3)" />
      {[[100, 30, 120, 22, ROSE], [100, 58, 56, 54, 'rgba(240,141,176,0.5)'], [162, 58, 58, 24, 'rgba(176,72,186,0.6)'], [162, 88, 58, 24, 'rgba(255,255,255,0.18)']].map(([x, y, w, h, f], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="6" fill={f} className="viz-stack" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      <g className="viz-chip" style={{ animationDelay: '1.4s' }}>
        <rect x="244" y="46" width="66" height="22" rx="11" fill="rgba(224,69,123,0.2)" stroke="rgba(240,141,176,0.5)" />
        <Txt x={277} y={61} anchor="middle" size={10.5} fill={SOFT}>shipped</Txt>
      </g>
      <g className="viz-chip" style={{ animationDelay: '0.8s' }}>
        <rect x="10" y="64" width="66" height="22" rx="11" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" />
        <Txt x={43} y={79} anchor="middle" size={10.5}>AI model</Txt>
      </g>
    </svg>
  )
}

const CAP_VIZ = { enterprise: VizEnterprise, workforce: VizWorkforce, revenue: VizRevenue, communication: VizCommunication, product: VizProduct }

export function CapabilityViz({ kind }) {
  const V = CAP_VIZ[kind]
  return V ? <V /> : null
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS — count-up numbers with a small dial each
// ═══════════════════════════════════════════════════════════════════════════════
function useCountUp(target, run, duration = 1400) {
  const [v, setV] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (!run || prefersReducedMotion()) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, duration])
  return v
}

const arc = (cx, cy, r, a0, a1) => {
  const p = (a) => [cx + r * Math.cos((a - 90) * Math.PI / 180), cy + r * Math.sin((a - 90) * Math.PI / 180)]
  const [x0, y0] = p(a0); const [x1, y1] = p(a1)
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

function Dial({ kind, value, max }) {
  const lit = (i, n) => value >= ((i + 1) / n) * max - 1e-6
  return (
    <svg viewBox="0 0 96 96" className="w-20 h-20" aria-hidden="true">
      {kind === 'segments' && Array.from({ length: 5 }).map((_, i) => (
        <path key={i} d={arc(48, 48, 38, i * 72 + 6, i * 72 + 66)} fill="none" strokeWidth="8" strokeLinecap="round" stroke={lit(i, 5) ? ROSE : 'rgba(255,255,255,0.1)'} style={{ transition: 'stroke 0.3s' }} />
      ))}
      {kind === 'dots' && Array.from({ length: 8 }).map((_, i) => (
        <circle key={i} cx={22 + (i % 4) * 17} cy={i < 4 ? 36 : 60} r="6.5" fill={lit(i, 8) ? SOFT : 'rgba(255,255,255,0.1)'} style={{ transition: 'fill 0.3s' }} />
      ))}
      {kind === 'clock' && (
        <g>
          <circle cx="48" cy="48" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 - 90) * Math.PI / 180
            return <line key={i} x1={48 + 32 * Math.cos(a)} y1={48 + 32 * Math.sin(a)} x2={48 + (i % 6 ? 36 : 38) * Math.cos(a)} y2={48 + (i % 6 ? 36 : 38) * Math.sin(a)} stroke={i * 15 <= (value / max) * 360 ? SOFT : 'rgba(255,255,255,0.2)'} strokeWidth="1.6" />
          })}
          <g className="viz-sweep"><line x1="48" y1="48" x2="48" y2="18" stroke={ROSE} strokeWidth="2.5" strokeLinecap="round" /></g>
          <circle cx="48" cy="48" r="3.5" fill="#fff" />
        </g>
      )}
      {kind === 'ring' && (
        <g>
          <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle cx="48" cy="48" r="36" fill="none" stroke={ROSE} strokeWidth="8" strokeLinecap="round" transform="rotate(-90 48 48)"
            strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - value / max)} />
        </g>
      )}
    </svg>
  )
}

// stat: { num, max, prefix, suffix, display?, label, kind }
export function StatTiles({ stats }) {
  const [ref, inView] = useInView(0.3)
  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => <StatTile key={s.label} s={s} run={inView} />)}
    </div>
  )
}

function StatTile({ s, run }) {
  const v = useCountUp(s.num, run)
  return (
    <div className="card p-6 sm:p-7 flex flex-col gap-5">
      <Dial kind={s.kind} value={v} max={s.max} />
      <div>
        <div className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-glow tabular-nums mb-2">
          {s.display ? (v >= s.num ? s.display : `${v}`) : `${s.prefix || ''}${v}${s.suffix || ''}`}
        </div>
        <div className="text-white/55 text-sm font-light leading-snug">{s.label}</div>
      </div>
    </div>
  )
}

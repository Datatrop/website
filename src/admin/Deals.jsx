import { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────
const SOURCE_OPTIONS = ['Referral', 'Website', 'LinkedIn', 'Cold Outreach', 'Event', 'Other']
const STAGE_OPTIONS = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Won', 'Lost']
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical']
const RUNNING_STATUS_OPTIONS = ['Planning', 'Development', 'Waiting for Client', 'Client Review', 'Testing', 'UAT', 'Deployment', 'Completed', 'On Hold']
const DELIVERABLE_STATUS = ['Not Started', 'In Progress', 'Completed']
const MILESTONE_STATUS = ['Pending', 'On Track', 'Delayed', 'Done']
const RISK_STATUS = ['Open', 'Monitoring', 'Resolved']
const RISK_PRIORITY = ['Low', 'Medium', 'High']
const COMM_TYPES = ['Meeting', 'Email', 'WhatsApp', 'Phone Call']

const stageColor = {
  Discovery: 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-500/20',
  Demo: 'bg-[rgb(var(--brand)/0.08)] dark:bg-rose/10 text-[rgb(var(--brand))] dark:text-rose-soft border-[rgb(var(--brand)/0.2)] dark:border-rose/20',
  Proposal: 'bg-[rgb(var(--accent)/0.1)] dark:bg-yellow-500/10 text-[rgb(var(--accent))] dark:text-yellow-400 border-[rgb(var(--accent)/0.25)] dark:border-yellow-500/20',
  Negotiation: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  Won: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
  Lost: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
}

const runningStatusColor = {
  Planning: 'bg-slate-100 dark:bg-gray-500/10 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-gray-500/20',
  Development: 'bg-[rgb(var(--brand)/0.08)] dark:bg-rose/10 text-[rgb(var(--brand))] dark:text-rose-soft border-[rgb(var(--brand)/0.2)] dark:border-rose/20',
  'Waiting for Client': 'bg-[rgb(var(--accent)/0.1)] dark:bg-yellow-500/10 text-[rgb(var(--accent))] dark:text-yellow-400 border-[rgb(var(--accent)/0.25)] dark:border-yellow-500/20',
  'Client Review': 'bg-[rgb(var(--accent)/0.1)] dark:bg-yellow-500/10 text-[rgb(var(--accent))] dark:text-yellow-400 border-[rgb(var(--accent)/0.25)] dark:border-yellow-500/20',
  Testing: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  UAT: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
  Deployment: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  Completed: 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20',
  'On Hold': 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20',
}

const priorityColor = {
  Low: 'text-slate-500 dark:text-gray-500',
  Medium: 'text-[rgb(var(--brand))] dark:text-rose-soft',
  High: 'text-orange-600 dark:text-orange-400',
  Critical: 'text-red-600 dark:text-red-400',
}

const emptyForm = {
  phase: 'discussion',
  deal_name: '', company: '', contact_person: '', email: '', phone: '', source: 'Website', sales_owner: '',
  stage: 'Discovery', probability: '', estimated_value: '', proposed_value: '', expected_closing_date: '',
  last_discussion: '', next_followup: '', proposal_version: '', proposal_document_url: '',
  meeting_notes: '', client_requirements: '', risks_notes: '', internal_notes: '',
  project_manager: '', lead_developer: '', supporting_developers: '', account_manager: '',
  backend_developer: '', frontend_developer: '', ai_engineer: '', qa_engineer: '', ui_designer: '',
  priority: 'Medium', start_date: '', expected_delivery: '', actual_completion: '', current_status: 'Planning',
  project_value: '', cost_estimate: '', development_cost: '', third_party_costs: '', amount_invoiced: '', amount_received: '',
  next_task: '', next_task_assigned: '', next_task_due: '',
  deliverables: [], milestones: [], daily_updates: [], attachments: [], risks_issues: [], communications: [],
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const fmtMoney = (v) => {
  const n = Number(v)
  if (!v || Number.isNaN(n)) return '—'
  return '₹' + n.toLocaleString('en-IN')
}
const daysUntil = (d) => {
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}
const progressOf = (deal) => {
  const list = deal.deliverables || []
  if (!list.length) return 0
  const done = list.filter((d) => d.status === 'Completed').length
  return Math.round((done / list.length) * 100)
}

// ─────────────────────────────────────────────────────────────────────────
// GENERIC REPEATING-ROW EDITOR (for the JSON array fields)
// ─────────────────────────────────────────────────────────────────────────
function RepeatingList({ label, rows, onChange, fields, emptyRow, addLabel }) {
  const inp = 'w-full px-2.5 py-2 rounded-lg bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-xs focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] transition-colors'

  const update = (i, key, val) => {
    const next = rows.slice()
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i))
  const add = () => onChange([...rows, { ...emptyRow }])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest">{label}</label>
        <button type="button" onClick={add} className="text-[11px] text-[rgb(var(--brand))] dark:text-rose-soft hover:text-[rgb(var(--accent))] dark:hover:text-rose font-medium transition-colors">
          {addLabel || '+ Add row'}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-slate-400 dark:text-gray-600 text-xs italic">Nothing added yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-end gap-2 p-2.5 rounded-xl border border-black/[0.06] dark:border-[#2A0F1D] bg-black/[0.015] dark:bg-white/[0.015]">
              {fields.map((f) => (
                <div key={f.key} className={f.width || 'flex-1'}>
                  <div className="text-[9px] text-slate-400 dark:text-gray-600 uppercase tracking-wide mb-1">{f.label}</div>
                  {f.type === 'select' ? (
                    <select className={inp} value={row[f.key] ?? ''} onChange={(e) => update(i, f.key, e.target.value)}>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      className={inp}
                      value={row[f.key] ?? ''}
                      onChange={(e) => update(i, f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}
              <button type="button" onClick={() => remove(i)} className="p-2 text-slate-400 dark:text-gray-600 hover:text-red-500 transition-colors" aria-label="Remove row">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
export default function Deals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('discussion') // 'discussion' | 'running'
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [stageFilter, setStageFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const load = async () => {
    try {
      const data = await api.list('deals')
      setDeals(Array.isArray(data) ? data : [])
    } catch {
      setDeals([])
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const pipeline = useMemo(() => deals.filter((d) => d.phase === 'discussion'), [deals])
  const running = useMemo(() => deals.filter((d) => d.phase === 'running'), [deals])

  const visiblePipeline = stageFilter === 'All' ? pipeline : pipeline.filter((d) => d.stage === stageFilter)
  const visibleRunning = statusFilter === 'All' ? running : running.filter((d) => d.current_status === statusFilter)

  // ── Dashboard widgets (Running Deals) ─────────────────────────────────────
  const widgets = useMemo(() => {
    const active = running.filter((d) => d.current_status !== 'Completed')
    const nearDeadline = active.filter((d) => {
      const dd = daysUntil(d.expected_delivery)
      return dd !== null && dd >= 0 && dd <= 7
    })
    const overdue = active.filter((d) => {
      const dd = daysUntil(d.expected_delivery)
      return dd !== null && dd < 0
    })
    const totalRevenue = active.reduce((sum, d) => sum + (Number(d.project_value) || 0), 0)
    const avgProgress = active.length ? Math.round(active.reduce((s, d) => s + progressOf(d), 0) / active.length) : 0
    const blocked = active.filter((d) => d.current_status === 'On Hold')
    const waiting = active.filter((d) => d.current_status === 'Waiting for Client')
    const workload = {}
    active.forEach((d) => {
      const dev = d.lead_developer?.trim()
      if (dev) workload[dev] = (workload[dev] || 0) + 1
    })
    return { active, nearDeadline, overdue, totalRevenue, avgProgress, blocked, waiting, workload }
  }, [running])

  // ── Pipeline totals ────────────────────────────────────────────────────────
  const pipelineTotal = useMemo(
    () => pipeline.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').reduce((s, d) => s + (Number(d.estimated_value) || 0), 0),
    [pipeline]
  )

  // ── Form open/save/delete ───────────────────────────────────────────────
  const openAdd = (phase) => {
    setEditing(null)
    setForm({ ...emptyForm, phase, ...(phase === 'running' ? { current_status: 'Planning' } : { stage: 'Discovery' }) })
    setFormError('')
    setModal(true)
  }

  const openEdit = (d) => {
    setEditing(d)
    // DB returns null for empty columns; fall back to emptyForm's typed defaults
    // ('' / []) instead so controlled inputs and .trim() calls never see null.
    const merged = { ...emptyForm }
    for (const key of Object.keys(emptyForm)) {
      merged[key] = d[key] === null || d[key] === undefined ? emptyForm[key] : d[key]
    }
    setForm(merged)
    setFormError('')
    setModal(true)
  }

  const convertToRunning = async (d) => {
    if (!confirm(`Move "${d.deal_name}" to Running Deals?`)) return
    try {
      await api.update('deals', d.id, {
        phase: 'running',
        current_status: 'Planning',
        start_date: d.start_date || new Date().toISOString().slice(0, 10),
        project_value: d.project_value || d.proposed_value || d.estimated_value || null,
      })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.deal_name.trim()) { setFormError('Deal name is required'); return }
    setSaving(true)
    setFormError('')

    const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : v)
    const payload = {
      phase: form.phase || 'discussion',
      deal_name: form.deal_name.trim(),
      company: form.company.trim() || null,
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source || null,
      sales_owner: form.sales_owner.trim() || null,
      stage: form.stage,
      probability: numOrNull(form.probability),
      estimated_value: numOrNull(form.estimated_value),
      proposed_value: numOrNull(form.proposed_value),
      expected_closing_date: form.expected_closing_date || null,
      last_discussion: form.last_discussion || null,
      next_followup: form.next_followup || null,
      proposal_version: form.proposal_version.trim() || null,
      proposal_document_url: form.proposal_document_url.trim() || null,
      meeting_notes: form.meeting_notes.trim() || null,
      client_requirements: form.client_requirements.trim() || null,
      risks_notes: form.risks_notes.trim() || null,
      internal_notes: form.internal_notes.trim() || null,
      project_manager: form.project_manager.trim() || null,
      lead_developer: form.lead_developer.trim() || null,
      supporting_developers: form.supporting_developers.trim() || null,
      account_manager: form.account_manager.trim() || null,
      backend_developer: form.backend_developer.trim() || null,
      frontend_developer: form.frontend_developer.trim() || null,
      ai_engineer: form.ai_engineer.trim() || null,
      qa_engineer: form.qa_engineer.trim() || null,
      ui_designer: form.ui_designer.trim() || null,
      priority: form.priority,
      start_date: form.start_date || null,
      expected_delivery: form.expected_delivery || null,
      actual_completion: form.actual_completion || null,
      current_status: form.current_status,
      project_value: numOrNull(form.project_value),
      cost_estimate: numOrNull(form.cost_estimate),
      development_cost: numOrNull(form.development_cost),
      third_party_costs: numOrNull(form.third_party_costs),
      amount_invoiced: numOrNull(form.amount_invoiced),
      amount_received: numOrNull(form.amount_received),
      next_task: form.next_task.trim() || null,
      next_task_assigned: form.next_task_assigned.trim() || null,
      next_task_due: form.next_task_due || null,
      deliverables: form.deliverables,
      milestones: form.milestones,
      daily_updates: form.daily_updates,
      attachments: form.attachments,
      risks_issues: form.risks_issues,
      communications: form.communications,
    }

    try {
      if (editing) {
        await api.update('deals', editing.id, payload)
      } else {
        await api.create('deals', payload)
      }
    } catch (err) {
      setSaving(false)
      setFormError(err.message)
      return
    }
    setSaving(false)
    setModal(false)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this deal? This cannot be undone.')) return
    await api.remove('deals', id)
    load()
  }

  const inp = 'w-full px-4 py-3 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-[#1B050D] dark:text-white placeholder-slate-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:border-[rgb(var(--brand)_/_0.5)] dark:focus:border-rose/40 focus:ring-1 focus:ring-[rgb(var(--brand)/0.12)] dark:focus:ring-rose/[0.12] transition-colors'
  const lbl = 'block text-[10px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1.5'
  const sectionTitle = 'text-[11px] font-bold text-[rgb(var(--brand))] dark:text-rose-soft uppercase tracking-widest mt-2 mb-1 pb-2 border-b border-black/[0.06] dark:border-white/10'

  const isRunning = form.phase === 'running'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-[#1B050D] dark:text-white">Deals</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-1">Pipeline &amp; execution tracking — internal only, never shown on the public site</p>
        </div>
        <button
          onClick={() => openAdd(tab)}
          className="px-4 py-2.5 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all duration-200 hover:-translate-y-px btn-cyan-glow"
        >
          + Add Deal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 border-b border-black/[0.07] dark:border-[#2A0F1D]">
        {[
          { key: 'discussion', label: 'Deals Under Discussion', count: pipeline.length },
          { key: 'running', label: 'Running Deals', count: running.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-[rgb(var(--brand))] text-[#1B050D] dark:text-white'
                : 'border-transparent text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label} <span className="text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ══════════════ PIPELINE VIEW ══════════════ */}
      {tab === 'discussion' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Widget label="Open Deals" value={pipeline.filter((d) => d.stage !== 'Won' && d.stage !== 'Lost').length} />
            <Widget label="Pipeline Value" value={fmtMoney(pipelineTotal)} />
            <Widget label="Won" value={pipeline.filter((d) => d.stage === 'Won').length} accent="green" />
            <Widget label="Lost" value={pipeline.filter((d) => d.stage === 'Lost').length} accent="red" />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {['All', ...STAGE_OPTIONS].map((s) => (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  stageFilter === s
                    ? 'bg-[rgb(var(--brand))] border-[rgb(var(--brand))] text-white'
                    : 'border-black/10 dark:border-[#33142A] text-slate-500 dark:text-gray-500 hover:border-black/20 dark:hover:border-[#3D1832]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
            {loading ? (
              <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading deals…</div>
            ) : visiblePipeline.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-slate-500 dark:text-gray-600 text-sm mb-3">
                  {pipeline.length === 0 ? 'No deals in discussion yet' : `No deals in stage "${stageFilter}"`}
                </p>
                {pipeline.length === 0 && (
                  <button onClick={() => openAdd('discussion')} className="text-[rgb(var(--brand))] dark:text-rose-soft hover:text-[rgb(var(--accent))] dark:hover:text-rose text-sm transition-colors">
                    Add your first deal →
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                      {['Deal', 'Company', 'Stage', 'Probability', 'Est. Value', 'Closing', 'Next Follow-up', ''].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                    {visiblePipeline.map((d) => (
                      <tr key={d.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-[#1B050D] dark:text-white font-medium">{d.deal_name}</div>
                          <div className="text-slate-400 dark:text-gray-600 text-[11px] mt-0.5">{d.deal_id}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{d.company || '—'}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${stageColor[d.stage] ?? stageColor.Discovery}`}>{d.stage}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{d.probability ? `${d.probability}%` : '—'}</td>
                        <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{fmtMoney(d.estimated_value)}</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-gray-600 whitespace-nowrap text-xs">{fmtDate(d.expected_closing_date)}</td>
                        <td className="px-5 py-4 text-slate-500 dark:text-gray-600 whitespace-nowrap text-xs">{fmtDate(d.next_followup)}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {d.stage === 'Won' && (
                              <button onClick={() => convertToRunning(d)} className="text-green-600 dark:text-green-400 hover:text-green-700 text-xs font-medium transition-colors">
                                Move to Running →
                              </button>
                            )}
                            <button onClick={() => openEdit(d)} className="text-slate-500 dark:text-gray-500 hover:text-[rgb(var(--brand))] dark:hover:text-rose text-xs font-medium transition-colors">Edit</button>
                            <button onClick={() => handleDelete(d.id)} className="text-slate-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ RUNNING VIEW ══════════════ */}
      {tab === 'running' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Widget label="🟢 Active Projects" value={widgets.active.length} />
            <Widget label="⏰ Near Deadline" value={widgets.nearDeadline.length} accent="yellow" />
            <Widget label="🚨 Overdue" value={widgets.overdue.length} accent="red" />
            <Widget label="💰 Total Active Revenue" value={fmtMoney(widgets.totalRevenue)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Widget label="📈 Average Progress" value={`${widgets.avgProgress}%`} />
            <Widget label="🔴 Blocked" value={widgets.blocked.length} accent="red" />
            <Widget label="⌛ Waiting for Client" value={widgets.waiting.length} accent="yellow" />
            <Widget
              label="👨‍💻 Developer Workload"
              value={Object.keys(widgets.workload).length ? Object.entries(widgets.workload).sort((a, b) => b[1] - a[1])[0][0] : '—'}
              sub={Object.keys(widgets.workload).length ? `${Object.entries(widgets.workload).sort((a, b) => b[1] - a[1])[0][1]} active` : ''}
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {['All', ...RUNNING_STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  statusFilter === s
                    ? 'bg-[rgb(var(--brand))] border-[rgb(var(--brand))] text-white'
                    : 'border-black/10 dark:border-[#33142A] text-slate-500 dark:text-gray-500 hover:border-black/20 dark:hover:border-[#3D1832]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509] overflow-hidden">
            {loading ? (
              <div className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 text-sm animate-pulse">Loading deals…</div>
            ) : visibleRunning.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-slate-500 dark:text-gray-600 text-sm mb-3">
                  {running.length === 0 ? 'No running deals yet' : `No deals with status "${statusFilter}"`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-black/[0.07] dark:border-[#2A0F1D]">
                      {['Project', 'Client', 'Status', 'Priority', 'Lead Dev', 'Progress', 'Delivery', ''].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] dark:divide-[#130710]">
                    {visibleRunning.map((d) => {
                      const pct = progressOf(d)
                      const dd = daysUntil(d.expected_delivery)
                      return (
                        <tr key={d.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.015] transition-colors group">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-[#1B050D] dark:text-white font-medium">{d.deal_name}</div>
                            <div className="text-slate-400 dark:text-gray-600 text-[11px] mt-0.5">{d.deal_id}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{d.company || '—'}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${runningStatusColor[d.current_status] ?? runningStatusColor.Planning}`}>{d.current_status}</span>
                          </td>
                          <td className={`px-5 py-4 whitespace-nowrap text-xs font-semibold ${priorityColor[d.priority] ?? ''}`}>{d.priority}</td>
                          <td className="px-5 py-4 text-slate-600 dark:text-gray-400 whitespace-nowrap">{d.lead_developer || '—'}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 w-28">
                              <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-[rgb(var(--brand))]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-xs">
                            <span className={dd !== null && dd < 0 ? 'text-red-600 dark:text-red-400 font-medium' : dd !== null && dd <= 7 ? 'text-[rgb(var(--accent))] dark:text-yellow-400 font-medium' : 'text-slate-500 dark:text-gray-600'}>
                              {fmtDate(d.expected_delivery)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(d)} className="text-slate-500 dark:text-gray-500 hover:text-[rgb(var(--brand))] dark:hover:text-rose text-xs font-medium transition-colors">Edit</button>
                              <button onClick={() => handleDelete(d.id)} className="text-slate-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ MODAL ══════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/75 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-[#0E0509] border border-black/[0.08] dark:border-[#2E1120] rounded-2xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[#1B050D] dark:text-white font-bold text-lg">{editing ? `Edit Deal — ${editing.deal_id}` : 'Add Deal'}</h2>
                {editing && <p className="text-slate-500 dark:text-gray-500 text-xs mt-0.5">{editing.phase === 'running' ? 'Running deal' : 'In discussion'}</p>}
              </div>
              <button onClick={() => setModal(false)} className="text-slate-500 dark:text-gray-600 hover:text-[#1B050D] dark:hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Phase toggle */}
              <div className="flex gap-2">
                {[{ v: 'discussion', l: 'Under Discussion' }, { v: 'running', l: 'Running' }].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, phase: p.v }))}
                    className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                      form.phase === p.v ? 'bg-[rgb(var(--brand))] border-[rgb(var(--brand))] text-white' : 'border-black/10 dark:border-[#33142A] text-slate-500 dark:text-gray-500'
                    }`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>

              {/* ── Identity ────────────────────────────────────────────── */}
              <div className={sectionTitle}>Deal Identity</div>
              <div>
                <label className={lbl}>Deal Name <span className="text-[rgb(var(--brand))] dark:text-rose-soft">*</span></label>
                <input type="text" value={form.deal_name} onChange={(e) => setForm((f) => ({ ...f, deal_name: e.target.value }))} placeholder="e.g. Revenue Intelligence Platform" className={inp} autoFocus />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={lbl}>Company</label><input type="text" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className={inp} /></div>
                <div><label className={lbl}>Contact Person</label><input type="text" value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} className={inp} /></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className={lbl}>Email</label><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inp} /></div>
                <div><label className={lbl}>Phone</label><input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                <div>
                  <label className={lbl}>Source</label>
                  <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inp}>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Sales Owner</label><input type="text" value={form.sales_owner} onChange={(e) => setForm((f) => ({ ...f, sales_owner: e.target.value }))} className={inp} placeholder="Who owns this deal" /></div>

              {!isRunning && (
                <>
                  {/* ── Pipeline fields ─────────────────────────────────── */}
                  <div className={sectionTitle}>Pipeline Details</div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>Stage</label>
                      <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} className={inp}>
                        {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className={lbl}>Probability %</label><input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Expected Closing</label><input type="date" value={form.expected_closing_date} onChange={(e) => setForm((f) => ({ ...f, expected_closing_date: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Estimated Value (₹)</label><input type="number" value={form.estimated_value} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Proposed Value (₹)</label><input type="number" value={form.proposed_value} onChange={(e) => setForm((f) => ({ ...f, proposed_value: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className={lbl}>Last Discussion</label><input type="date" value={form.last_discussion} onChange={(e) => setForm((f) => ({ ...f, last_discussion: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Next Follow-up</label><input type="date" value={form.next_followup} onChange={(e) => setForm((f) => ({ ...f, next_followup: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Proposal Version</label><input type="text" value={form.proposal_version} onChange={(e) => setForm((f) => ({ ...f, proposal_version: e.target.value }))} placeholder="v1, v2…" className={inp} /></div>
                  </div>
                  <div><label className={lbl}>Proposal Document (link)</label><input type="text" value={form.proposal_document_url} onChange={(e) => setForm((f) => ({ ...f, proposal_document_url: e.target.value }))} placeholder="https://drive.google.com/…" className={inp} /></div>
                  <div><label className={lbl}>Meeting Notes</label><textarea value={form.meeting_notes} onChange={(e) => setForm((f) => ({ ...f, meeting_notes: e.target.value }))} rows={3} className={`${inp} resize-none`} /></div>
                  <div><label className={lbl}>Client Requirements</label><textarea value={form.client_requirements} onChange={(e) => setForm((f) => ({ ...f, client_requirements: e.target.value }))} rows={3} className={`${inp} resize-none`} /></div>
                  <div><label className={lbl}>Risks</label><textarea value={form.risks_notes} onChange={(e) => setForm((f) => ({ ...f, risks_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} /></div>
                  <div><label className={lbl}>Internal Notes (admin only)</label><textarea value={form.internal_notes} onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))} rows={2} className={`${inp} resize-none`} /></div>
                </>
              )}

              {isRunning && (
                <>
                  {/* ── Project info ────────────────────────────────────── */}
                  <div className={sectionTitle}>Project Information</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Project Manager</label><input type="text" value={form.project_manager} onChange={(e) => setForm((f) => ({ ...f, project_manager: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Account Manager</label><input type="text" value={form.account_manager} onChange={(e) => setForm((f) => ({ ...f, account_manager: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Lead Developer</label><input type="text" value={form.lead_developer} onChange={(e) => setForm((f) => ({ ...f, lead_developer: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Supporting Developers</label><input type="text" value={form.supporting_developers} onChange={(e) => setForm((f) => ({ ...f, supporting_developers: e.target.value }))} className={inp} placeholder="comma separated" /></div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>Priority</label>
                      <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={inp}>
                        {PRIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Current Status</label>
                      <select value={form.current_status} onChange={(e) => setForm((f) => ({ ...f, current_status: e.target.value }))} className={inp}>
                        {RUNNING_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className={lbl}>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Expected Delivery</label><input type="date" value={form.expected_delivery} onChange={(e) => setForm((f) => ({ ...f, expected_delivery: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Actual Completion</label><input type="date" value={form.actual_completion} onChange={(e) => setForm((f) => ({ ...f, actual_completion: e.target.value }))} className={inp} /></div>
                  </div>

                  {/* ── Team ────────────────────────────────────────────── */}
                  <div className={sectionTitle}>Team</div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className={lbl}>Backend Developer</label><input type="text" value={form.backend_developer} onChange={(e) => setForm((f) => ({ ...f, backend_developer: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Frontend Developer</label><input type="text" value={form.frontend_developer} onChange={(e) => setForm((f) => ({ ...f, frontend_developer: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>AI Engineer</label><input type="text" value={form.ai_engineer} onChange={(e) => setForm((f) => ({ ...f, ai_engineer: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>QA Engineer</label><input type="text" value={form.qa_engineer} onChange={(e) => setForm((f) => ({ ...f, qa_engineer: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>UI Designer</label><input type="text" value={form.ui_designer} onChange={(e) => setForm((f) => ({ ...f, ui_designer: e.target.value }))} className={inp} /></div>
                  </div>

                  {/* ── Financial ───────────────────────────────────────── */}
                  <div className={sectionTitle}>Financial</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Project Value (₹)</label><input type="number" value={form.project_value} onChange={(e) => setForm((f) => ({ ...f, project_value: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Cost Estimate (₹)</label><input type="number" value={form.cost_estimate} onChange={(e) => setForm((f) => ({ ...f, cost_estimate: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Development Cost (₹)</label><input type="number" value={form.development_cost} onChange={(e) => setForm((f) => ({ ...f, development_cost: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Third-party Costs (₹)</label><input type="number" value={form.third_party_costs} onChange={(e) => setForm((f) => ({ ...f, third_party_costs: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={lbl}>Amount Invoiced (₹)</label><input type="number" value={form.amount_invoiced} onChange={(e) => setForm((f) => ({ ...f, amount_invoiced: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Amount Received (₹)</label><input type="number" value={form.amount_received} onChange={(e) => setForm((f) => ({ ...f, amount_received: e.target.value }))} className={inp} /></div>
                  </div>
                  {(form.amount_invoiced || form.amount_received || form.project_value) && (
                    <div className="grid sm:grid-cols-2 gap-4 text-xs">
                      <div className="px-3 py-2.5 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-400">
                        Pending: <span className="font-semibold text-[#1B050D] dark:text-white">{fmtMoney((Number(form.amount_invoiced) || 0) - (Number(form.amount_received) || 0))}</span>
                      </div>
                      <div className="px-3 py-2.5 rounded-xl bg-[#FAF5F8] dark:bg-[#10060B] border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-400">
                        Est. Profit: <span className="font-semibold text-[#1B050D] dark:text-white">
                          {fmtMoney((Number(form.project_value) || 0) - (Number(form.cost_estimate) || 0) - (Number(form.development_cost) || 0) - (Number(form.third_party_costs) || 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Deliverables ────────────────────────────────────── */}
                  <div className={sectionTitle}>Deliverables {form.deliverables.length > 0 && `— ${progressOf(form)}% complete`}</div>
                  <RepeatingList
                    label="Deliverables checklist"
                    rows={form.deliverables}
                    onChange={(rows) => setForm((f) => ({ ...f, deliverables: rows }))}
                    emptyRow={{ name: '', status: 'Not Started', due_date: '', completed_date: '' }}
                    addLabel="+ Add deliverable"
                    fields={[
                      { key: 'name', label: 'Deliverable', placeholder: 'e.g. Website', width: 'flex-[2]' },
                      { key: 'status', label: 'Status', type: 'select', options: DELIVERABLE_STATUS },
                      { key: 'due_date', label: 'Due', type: 'date' },
                      { key: 'completed_date', label: 'Completed', type: 'date' },
                    ]}
                  />

                  {/* ── Milestones ──────────────────────────────────────── */}
                  <div className={sectionTitle}>Timeline / Milestones</div>
                  <RepeatingList
                    label="Milestones"
                    rows={form.milestones}
                    onChange={(rows) => setForm((f) => ({ ...f, milestones: rows }))}
                    emptyRow={{ name: '', planned_date: '', actual_date: '', status: 'Pending' }}
                    addLabel="+ Add milestone"
                    fields={[
                      { key: 'name', label: 'Milestone', width: 'flex-[2]' },
                      { key: 'planned_date', label: 'Planned', type: 'date' },
                      { key: 'actual_date', label: 'Actual', type: 'date' },
                      { key: 'status', label: 'Status', type: 'select', options: MILESTONE_STATUS },
                    ]}
                  />

                  {/* ── Daily progress feed ─────────────────────────────── */}
                  <div className={sectionTitle}>Daily Progress Feed</div>
                  <RepeatingList
                    label="Updates"
                    rows={form.daily_updates}
                    onChange={(rows) => setForm((f) => ({ ...f, daily_updates: rows }))}
                    emptyRow={{ date: new Date().toISOString().slice(0, 10), developer: '', update: '', hours: '', blockers: '' }}
                    addLabel="+ Add update"
                    fields={[
                      { key: 'date', label: 'Date', type: 'date' },
                      { key: 'developer', label: 'Developer' },
                      { key: 'update', label: 'Update', placeholder: 'What was done', width: 'flex-[2]' },
                      { key: 'hours', label: 'Hours', type: 'number' },
                      { key: 'blockers', label: 'Blockers', width: 'flex-[2]' },
                    ]}
                  />

                  {/* ── Risks & Issues ──────────────────────────────────── */}
                  <div className={sectionTitle}>Risks &amp; Issues</div>
                  <RepeatingList
                    label="Risks / issues"
                    rows={form.risks_issues}
                    onChange={(rows) => setForm((f) => ({ ...f, risks_issues: rows }))}
                    emptyRow={{ issue: '', priority: 'Medium', owner: '', status: 'Open' }}
                    addLabel="+ Add risk"
                    fields={[
                      { key: 'issue', label: 'Issue', width: 'flex-[2]' },
                      { key: 'priority', label: 'Priority', type: 'select', options: RISK_PRIORITY },
                      { key: 'owner', label: 'Owner' },
                      { key: 'status', label: 'Status', type: 'select', options: RISK_STATUS },
                    ]}
                  />

                  {/* ── Client Communication ────────────────────────────── */}
                  <div className={sectionTitle}>Client Communication</div>
                  <RepeatingList
                    label="Communication log"
                    rows={form.communications}
                    onChange={(rows) => setForm((f) => ({ ...f, communications: rows }))}
                    emptyRow={{ date: new Date().toISOString().slice(0, 10), type: 'Meeting', summary: '' }}
                    addLabel="+ Add entry"
                    fields={[
                      { key: 'date', label: 'Date', type: 'date' },
                      { key: 'type', label: 'Type', type: 'select', options: COMM_TYPES },
                      { key: 'summary', label: 'Summary', width: 'flex-[2]' },
                    ]}
                  />

                  {/* ── Attachments ─────────────────────────────────────── */}
                  <div className={sectionTitle}>Attachments (links)</div>
                  <RepeatingList
                    label="Files / links"
                    rows={form.attachments}
                    onChange={(rows) => setForm((f) => ({ ...f, attachments: rows }))}
                    emptyRow={{ label: '', url: '', category: '' }}
                    addLabel="+ Add attachment"
                    fields={[
                      { key: 'label', label: 'Label', placeholder: 'e.g. SOW, Figma, Contract' },
                      { key: 'url', label: 'URL', placeholder: 'https://…', width: 'flex-[2]' },
                      { key: 'category', label: 'Category' },
                    ]}
                  />

                  {/* ── Next action ─────────────────────────────────────── */}
                  <div className={sectionTitle}>Next Action</div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className={lbl}>Next Task</label><input type="text" value={form.next_task} onChange={(e) => setForm((f) => ({ ...f, next_task: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Assigned To</label><input type="text" value={form.next_task_assigned} onChange={(e) => setForm((f) => ({ ...f, next_task_assigned: e.target.value }))} className={inp} /></div>
                    <div><label className={lbl}>Due Date</label><input type="date" value={form.next_task_due} onChange={(e) => setForm((f) => ({ ...f, next_task_due: e.target.value }))} className={inp} /></div>
                  </div>
                </>
              )}

              {formError && (
                <div className="text-red-600 dark:text-red-400 text-xs px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">{formError}</div>
              )}

              <div className="flex gap-3 pt-1 sticky bottom-0 bg-white dark:bg-[#0E0509] pb-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-3 rounded-xl border border-black/10 dark:border-[#33142A] text-slate-600 dark:text-gray-400 hover:text-[#1B050D] dark:hover:text-white hover:border-black/20 dark:hover:border-[#3D1832] text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[rgb(var(--brand))] hover:shadow-[0_10px_40px_-8px_rgb(var(--brand)_/_0.6)] text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Widget({ label, value, sub, accent }) {
  const accentColor = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-[rgb(var(--accent))] dark:text-yellow-400',
  }[accent] || 'text-[#1B050D] dark:text-white'

  return (
    <div className="p-4 rounded-2xl border border-black/[0.07] dark:border-[#2A0F1D] bg-white dark:bg-[#0D0509]">
      <div className="text-[10px] font-semibold text-slate-500 dark:text-gray-600 uppercase tracking-widest mb-1.5 truncate">{label}</div>
      <div className={`text-2xl font-bold ${accentColor} truncate`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

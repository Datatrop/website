// Maps admin-entered problem titles / service-line names to an illustration.
// Kept apart from visuals.jsx so that file only exports components.

export function problemKind(title = '') {
  const s = title.toLowerCase()
  if (/fragment|disconnect|silo/.test(s)) return 'fragmented'
  if (/revenue|leak|sales|lead/.test(s)) return 'leakage'
  if (/communicat|call|chaos/.test(s)) return 'communication'
  if (/intelligence|knowledge|memory/.test(s)) return 'knowledge'
  if (/dependen|human|manual|workforce/.test(s)) return 'dependency'
  if (/decision|delay|report|visibility/.test(s)) return 'delay'
  return 'generic'
}

export function capabilityKind(name = '') {
  const s = name.toLowerCase()
  if (/workforce|agent/.test(s)) return 'workforce'
  if (/revenue|sales|lead/.test(s)) return 'revenue'
  if (/communicat|call|conversation/.test(s)) return 'communication'
  if (/product/.test(s)) return 'product'
  if (/enterprise|operating|platform/.test(s)) return 'enterprise'
  return null
}

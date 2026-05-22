const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const TZ = 'Asia/Jakarta'

function localDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: TZ })
}

function todayLocal() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }) }
function yesterdayLocal() {
  return new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: TZ })
}

export function formatTime(isoStr) {
  const dt = new Date(isoStr)
  const d  = localDate(isoStr)
  const t  = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  if (d === todayLocal())     return `Today · ${t}`
  if (d === yesterdayLocal()) return `Yest · ${t}`
  return `${DAY_NAMES[dt.getDay()]} · ${t}`
}

export function groupLabel(isoStr) {
  const d   = localDate(isoStr)
  const td  = todayLocal()
  const yd  = yesterdayLocal()
  if (d === td) return 'Today'
  if (d === yd) return 'Yesterday'
  const dt  = new Date(isoStr)
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: TZ })
}

// Decorate an expense from the API with computed time/date fields.
export function decorate(e) {
  return { ...e, time: formatTime(e.occurred_at), date: localDate(e.occurred_at) }
}

// Returns YYYY-MM-DD strings for the last 7 days (index 0 = 6 days ago, 6 = today).
export function getWeekDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA', { timeZone: TZ })
  })
}

// Single-letter day abbreviation for a YYYY-MM-DD string.
export function getDayAbbr(dateStr) {
  return ['S','M','T','W','T','F','S'][new Date(dateStr + 'T12:00:00').getDay()]
}

// Human-readable label for a YYYY-MM-DD string ("Today", "Yesterday", or "Monday, May 19").
export function getDayLabel(dateStr) {
  if (dateStr === todayLocal())     return 'Today'
  if (dateStr === yesterdayLocal()) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// Aggregate expenses into [{cat, amount, pct}] sorted by amount desc.
export function computeCats(expenses) {
  const map = {}
  let total = 0
  for (const e of expenses) { map[e.cat] = (map[e.cat] || 0) + e.amount; total += e.amount }
  return Object.entries(map)
    .map(([cat, amount]) => ({ cat, amount, pct: total ? Math.round((amount / total) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

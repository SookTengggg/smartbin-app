// Shared constants, category metadata and formatting helpers.

export const STATIONS = ['Main Kitchen']

// Must match the reason strings the backend groups by (routers/analytics.py).
export const REASONS = ['Plate waste', 'Over-preparation', 'Expiration or spoilage', 'Prep trimmings', 'Others']

// Records saved outside this app (for example from the API docs page) may spell a reason differently:
// "Plate Waste", "Expiration/Spoilage", "Prep Trimmings". This maps any spelling to one of the five
// reasons above, so every disposal is counted under a reason. Anything unknown counts as "Others".
const REASON_ALIASES = {
  platewaste: 'Plate waste',
  plate: 'Plate waste',
  overpreparation: 'Over-preparation',
  overprepared: 'Over-preparation',
  overprep: 'Over-preparation',
  expirationorspoilage: 'Expiration or spoilage',
  expirationspoilage: 'Expiration or spoilage',
  expiration: 'Expiration or spoilage',
  expired: 'Expiration or spoilage',
  spoilage: 'Expiration or spoilage',
  spoiled: 'Expiration or spoilage',
  preptrimmings: 'Prep trimmings',
  preptrimming: 'Prep trimmings',
  trimmings: 'Prep trimmings',
  others: 'Others',
  other: 'Others',
}
export function canonicalReason(name) {
  const k = String(name || '').toLowerCase().replace(/[^a-z]/g, '')
  return REASON_ALIASES[k] || 'Others'
}

// Adds up a backend reason list ([{ reason, count, weight_kg, cost_myr?, foods? }]) under the five reasons,
// so differently spelt reasons are not lost. Foods are merged by category.
export function mergeReasons(list) {
  const out = Object.fromEntries(REASONS.map((r) => [r, { reason: r, count: 0, weight_kg: 0, cost_myr: 0, foods: {}, spellings: [] }]))
  ;(list || []).forEach((x) => {
    const m = out[canonicalReason(x.reason)]
    m.count += Number(x.count) || 0
    m.weight_kg += Number(x.weight_kg) || 0
    m.cost_myr += Number(x.cost_myr) || 0
    if (x.reason !== m.reason && (Number(x.count) || 0) > 0) m.spellings.push(x.reason)
    ;(x.foods || []).forEach((f) => {
      const key = String(f.category || '').trim().toLowerCase().replace(/\s+/g, '_')
      const g = (m.foods[key] ||= { category: f.category, weight_kg: 0, cost_myr: 0 })
      g.weight_kg += Number(f.weight_kg) || 0
      g.cost_myr += Number(f.cost_myr) || 0
    })
  })
  return REASONS.map((r) => ({ ...out[r], foods: Object.values(out[r].foods).sort((a, b) => b.weight_kg - a.weight_kg) }))
}

// Carbon factor used by the backend (routers/disposal.py): UK DESNZ 2026, food waste to landfill.
export const CO2_PER_KG = 0.7

// The SRS has no company setting yet, so the ESG report uses this sample name.
export const COMPANY_NAME = 'Restoran Contoh Sdn Bhd'

export const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 days' },
  { value: '30days', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
]

// One fixed colour per food category, so a category keeps its colour on every chart.
const CATEGORY_COLORS = {
  rice_rice_dishes: '#D99A1C',
  noodles_pasta: '#C49A5A',
  bread_bakery: '#9A5520',
  chicken: '#E07A3A',
  beef_lamb: '#B42E2E',
  seafood: '#1F78A8',
  eggs_dairy: '#5B8FD6',
  vegetables_cooked: '#1F8A5F',
  fruits_raw: '#7FB241',
  soup_curry: '#8E5BB5',
  desserts_sweets: '#D4589B',
  mixed_leftovers: '#8A97A0',
  non_food: '#56626B',
}
export const OTHER_COLOR = '#B8C2C8'
const EXTRA = ['#0E7490', '#A16207', '#7C3AED', '#BE185D', '#4D7C0F']

export function categoryColor(key) {
  if (CATEGORY_COLORS[key]) return CATEGORY_COLORS[key]
  let h = 0
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return EXTRA[h % EXTRA.length]
}

export function titleCase(key) {
  return String(key || '')
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

// names: { category_key: display_name } loaded from the pricing table
export function categoryName(key, names) {
  return (names && names[key]) || titleCase(key)
}

// The backend's food breakdown lists send "category" as a title-cased name ("Rice Rice Dishes")
// instead of the key ("rice_rice_dishes"). This turns either form back into the key.
export function keyOf(category) {
  return String(category || '').trim().toLowerCase().replace(/\s+/g, '_')
}

// The log list sends categories as a title-cased string, e.g. "Rice Rice Dishes, Chicken".
export function keysFromSummary(summary) {
  if (!summary || summary === 'Not labelled yet') return []
  return summary.split(', ').map((s) => s.trim().toLowerCase().replace(/ /g, '_'))
}

// Numbers
export const kg = (v, d = 2) => (Number(v) || 0).toFixed(d)
export const rm = (v) => 'RM ' + (Number(v) || 0).toFixed(2)
export const pct = (v, d = 1) => (Number(v) || 0).toFixed(d) + '%'

// Dates, always shown in Malaysia time
const TZ = 'Asia/Kuala_Lumpur'
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
export const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function dateKey(d) {
  return keyFmt.format(d instanceof Date ? d : new Date(d))
}
export function shortDate(key) {
  const [, m, d] = key.split('-').map(Number)
  return `${d} ${MON[m - 1]}`
}
export function longDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return `${d} ${MON[m - 1]} ${y}`
}
export function timeOf(iso) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
export function dateTimeOf(iso) {
  return `${longDate(dateKey(iso))}, ${timeOf(iso)}`
}
export function nowStamp() {
  return dateTimeOf(new Date().toISOString())
}

export function addDays(key, n) {
  const d = new Date(key + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// The calendar days a filter covers, matching the backend's range logic.
export function daysInRange(filter) {
  const today = dateKey(new Date())
  let start = today
  let end = today
  if (filter.range === '7days') start = dateKey(new Date(Date.now() - 7 * 864e5))
  else if (filter.range === '30days') start = dateKey(new Date(Date.now() - 30 * 864e5))
  else if (filter.range === 'custom' && filter.from && filter.to) {
    start = filter.from
    end = filter.to
  }
  const out = []
  for (let k = start; k <= end && out.length < 400; k = addDays(k, 1)) out.push(k)
  return out
}

// "Today" is grouped by hour by the backend ("09:00"). Show the working day (08:00 to 21:00),
// widened to include any hour that has waste.
export function hoursForToday(trendKeys = []) {
  const used = trendKeys.map((k) => parseInt(k, 10)).filter((h) => h >= 0 && h <= 23)
  const lo = Math.min(8, ...used)
  const hi = Math.max(21, ...used)
  const out = []
  for (let h = lo; h <= hi; h++) out.push(String(h).padStart(2, '0') + ':00')
  return out
}

export function rangeLabel(filter) {
  const days = daysInRange(filter)
  if (days.length === 1) return longDate(days[0])
  return `${longDate(days[0])} to ${longDate(days[days.length - 1])}`
}

export function previousLabel(filter) {
  if (filter.range === 'today') return 'yesterday'
  if (filter.range === '7days') return 'previous 7 days'
  if (filter.range === '30days') return 'previous 30 days'
  return 'previous period'
}

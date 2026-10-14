// Shared constants, category metadata and formatting helpers.

export const STATIONS = ['Main Kitchen']

// Must match the reason strings the backend groups by (routers/analytics.py).
export const REASONS = ['Plate waste', 'Over-preparation', 'Expiration or spoilage', 'Prep trimmings', 'Others']

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

function addDays(key, n) {
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

import { OTHER_COLOR, categoryColor, categoryName, hoursForToday, keyOf, longDate, shortDate } from './format'

// A backend "foods" list ([{ category, weight_kg, cost_myr }]) with keys, names and colours added.
export function foodsOf(list, names) {
  return (list || [])
    .filter((f) => Number(f.weight_kg) > 0 || Number(f.cost_myr) > 0)
    .map((f) => {
      const key = keyOf(f.category)
      return { key, name: categoryName(key, names), color: categoryColor(key), weight_kg: Number(f.weight_kg) || 0, cost_myr: Number(f.cost_myr) || 0 }
    })
}

// Fill in days (or, for "today", hours) with no waste so the x-axis shows every slot in the range.
// The backend sends "date" as "YYYY-MM-DD", or as "HH:00" when the range is today.
export function trendSeries(days, dailyTrends, { hourly = false } = {}) {
  const byKey = Object.fromEntries((dailyTrends || []).map((d) => [d.date, d]))
  const keys = hourly ? hoursForToday(Object.keys(byKey)) : days
  return keys.map((key) => {
    const hit = byKey[key]
    return {
      date: key,
      label: hourly ? key : shortDate(key),
      title: hourly ? `${key} to ${String(parseInt(key, 10) + 1).padStart(2, '0')}:00` : longDate(key),
      weight_kg: hit?.weight_kg || 0,
      cost_myr: hit?.cost_myr || 0,
      count: hit?.disposals_count || 0,
      foods: hit?.foods || [],
    }
  })
}

// Top 5 categories by weight, the rest folded into "Other".
export function donutSlices(shares, names, top = 5) {
  const sorted = [...(shares || [])].filter((s) => s.weight_kg > 0).sort((a, b) => b.weight_kg - a.weight_kg)
  const total = sorted.reduce((s, x) => s + x.weight_kg, 0)
  const head = sorted.slice(0, top).map((s) => ({
    key: s.category,
    name: categoryName(s.category, names),
    weight_kg: s.weight_kg,
    cost_myr: s.cost_myr,
    color: categoryColor(s.category),
  }))
  const rest = sorted.slice(top)
  if (rest.length) {
    head.push({
      key: '_other',
      name: `Other (${rest.length})`,
      weight_kg: rest.reduce((s, x) => s + x.weight_kg, 0),
      cost_myr: rest.reduce((s, x) => s + x.cost_myr, 0),
      color: OTHER_COLOR,
    })
  }
  return { slices: head.map((s) => ({ ...s, pct: total ? (s.weight_kg / total) * 100 : 0 })), total }
}


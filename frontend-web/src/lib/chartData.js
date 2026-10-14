import { OTHER_COLOR, categoryColor, categoryName, shortDate } from './format'

// Fill in days with no waste so the x-axis shows every day in the range.
export function trendSeries(days, dailyTrends) {
  const byDate = Object.fromEntries((dailyTrends || []).map((d) => [d.date, d]))
  return days.map((key) => ({
    date: key,
    label: shortDate(key),
    weight_kg: byDate[key]?.weight_kg || 0,
    cost_myr: byDate[key]?.cost_myr || 0,
  }))
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

